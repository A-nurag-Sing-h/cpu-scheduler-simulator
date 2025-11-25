// Wait for the DOM to be fully loaded before running any script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE ---
    let processList = [];   // Array to store all process objects
    let pidCounter = 1;     // Counter for unique Process IDs
    let ganttChart = null;  // Variable to hold the Chart.js instance
    let simulationRunning = false; // Flag to prevent multiple simulations

    // --- 2. DOM ELEMENT REFERENCES ---
    const processForm = document.getElementById('process-form');
    const arrivalTimeInput = document.getElementById('arrival-time');
    const burstTimeInput = document.getElementById('burst-time');
    const priorityInput = document.getElementById('priority');
    const addProcessBtn = document.getElementById('add-process-btn');
    const clearProcessesBtn = document.getElementById('clear-processes-btn');
    
    const algorithmSelect = document.getElementById('algorithm-select');
    const timeQuantumGroup = document.getElementById('time-quantum-group');
    const timeQuantumInput = document.getElementById('time-quantum');
    const runSimulationBtn = document.getElementById('run-simulation-btn');

    const processTableBody = document.getElementById('process-table-body');
    
    // Simulation "Stage" Elements
    const readyQueueProcesses = document.getElementById('ready-queue-processes');
    const cpuProcessHolder = document.getElementById('cpu-process');
    const completedProcessesList = document.getElementById('completed-processes-list');
    const simulationTime = document.getElementById('simulation-time');

    // Results Elements
    const ganttChartCanvas = document.getElementById('gantt-chart').getContext('2d');
    const avgWaitingTime = document.getElementById('avg-waiting-time');
    const avgTurnaroundTime = document.getElementById('avg-turnaround-time');


    // --- 3. EVENT LISTENERS ---
    addProcessBtn.addEventListener('click', addProcess);
    clearProcessesBtn.addEventListener('click', clearProcesses);
    algorithmSelect.addEventListener('change', toggleTimeQuantum);
    processForm.addEventListener('submit', runSimulation); // Main entry point

    
    // --- 4. CORE UI FUNCTIONS ---

    function addProcess() {
        const arrival = parseInt(arrivalTimeInput.value);
        const burst = parseInt(burstTimeInput.value);
        const priority = parseInt(priorityInput.value);

        if (isNaN(arrival) || isNaN(burst) || isNaN(priority) || arrival < 0 || burst <= 0 || priority < 0) {
            alert('Please enter valid, non-negative numbers (Burst > 0).');
            return;
        }

        const newProcess = {
            pid: 'P' + pidCounter,
            arrival: arrival,
            burst: burst,
            priority: priority,
        };

        pidCounter++;
        processList.push(newProcess);
        updateProcessTable();
        clearInputFields();
    }

    function updateProcessTable() {
        processTableBody.innerHTML = '';
        processList.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.pid}</td>
                <td>${process.arrival}</td>
                <td>${process.burst}</td>
                <td>${process.priority}</td>
            `;
            processTableBody.appendChild(row);
        });
    }

    function clearInputFields() {
        arrivalTimeInput.value = '0';
        burstTimeInput.value = '5';
        priorityInput.value = '0';
        arrivalTimeInput.focus();
    }

    function clearProcesses() {
        if (simulationRunning) {
            alert("Cannot clear processes while simulation is running.");
            return;
        }
        processList = [];
        pidCounter = 1;
        updateProcessTable();
        resetResults();
    }

    function toggleTimeQuantum() {
        if (algorithmSelect.value === 'rr') {
            timeQuantumGroup.style.display = 'flex';
        } else {
            timeQuantumGroup.style.display = 'none';
        }
    }

    function resetResults() {
        avgWaitingTime.textContent = '-';
        avgTurnaroundTime.textContent = '-';
        simulationTime.textContent = '0';

        readyQueueProcesses.innerHTML = '';
        cpuProcessHolder.innerHTML = '';
        completedProcessesList.innerHTML = '';

        if (ganttChart) {
            ganttChart.destroy();
            ganttChart = null;
        }
    }

    // --- 5. SIMULATION START ---

    async function runSimulation(e) {
        e.preventDefault();
        if (simulationRunning) return;
        if (processList.length === 0) {
            alert('Please add at least one process.');
            return;
        }

        simulationRunning = true;
        runSimulationBtn.disabled = true;
        runSimulationBtn.textContent = "Running...";
        resetResults();

        const algorithm = algorithmSelect.value;
        const timeQuantum = parseInt(timeQuantumInput.value);

        if (algorithm === 'rr' && (isNaN(timeQuantum) || timeQuantum <= 0)) {
            alert('Please enter a valid Time Quantum > 0 for Round Robin.');
            simulationRunning = false;
            runSimulationBtn.disabled = false;
            runSimulationBtn.textContent = "Run Simulation";
            return;
        }

        const processes = JSON.parse(JSON.stringify(processList)).map(p => ({
            ...p,
            remainingTime: p.burst,
            startTime: -1,
            completionTime: 0,
            waitingTime: 0,
            turnaroundTime: 0
        }));

        try {
            const { pids, chartData } = initGanttChart(processes);
            const completedProcesses = await animateSimulation(processes, algorithm, timeQuantum, pids, chartData);
            const metrics = calculateMetrics(completedProcesses);
            updateMetrics(metrics);
        } catch (error) {
            console.error("Simulation failed:", error);
            alert("An error occurred during the simulation.");
        } finally {
            simulationRunning = false;
            runSimulationBtn.disabled = false;
            runSimulationBtn.textContent = "Run Simulation";
        }
    }


    // --- 6. ANIMATION ENGINE (Corrected) ---

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createProcessPill(pid) {
        const pill = document.createElement('div');
        pill.classList.add('process-pill');
        pill.id = `pill-${pid}`;
        pill.textContent = pid;
        pill.style.backgroundColor = getProcessColor(pid);
        return pill;
    }

    function updateUI(state) {
        readyQueueProcesses.innerHTML = '';
        state.readyQueue.forEach(p => {
            readyQueueProcesses.appendChild(createProcessPill(p.pid));
        });

        cpuProcessHolder.innerHTML = '';
        if (state.cpuProcess) {
            cpuProcessHolder.appendChild(createProcessPill(state.cpuProcess.pid));
        }

        completedProcessesList.innerHTML = '';
        state.completed.forEach(p => {
            completedProcessesList.appendChild(createProcessPill(p.pid));
        });

        simulationTime.textContent = state.currentTime;
    }

    /**
     * The main real-time simulation loop. (Corrected for bug)
     */
    async function animateSimulation(processes, algorithm, timeQuantum, pids, chartData) {
        let currentTime = 0;
        let currentProcess = null;
        let quantumCounter = 0;
        
        const readyQueue = [];
        const completed = [];
        const n = processes.length;

        processes.sort((a, b) => a.arrival - b.arrival);

        while (completed.length < n) {
            
            // 1. Check for arriving processes
            processes.forEach(p => {
                if (p.arrival === currentTime && !completed.find(c => c.pid === p.pid) && !readyQueue.find(r => r.pid === p.pid)) {
                    readyQueue.push(p);
                }
            });
            
            // 2. If CPU is idle, try to select a process
            if (currentProcess === null && readyQueue.length > 0) {
                
                if (algorithm === 'fcfs') {
                    currentProcess = readyQueue.shift();
                } 
                else if (algorithm === 'sjf') {
                    readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
                    currentProcess = readyQueue.shift();
                }
                else if (algorithm === 'priority') {
                    readyQueue.sort((a, b) => a.priority - b.priority);
                    currentProcess = readyQueue.shift();
                }
                else if (algorithm === 'rr') {
                    currentProcess = readyQueue.shift();
                }

                quantumCounter = 0;
                if (currentProcess.startTime === -1) {
                    currentProcess.startTime = currentTime;
                }
            }

            // 3. If the CPU has a process, do one tick of work
            if (currentProcess) {
                updateGanttChart(currentProcess.pid, currentTime, currentTime + 1, pids, chartData);
                currentProcess.remainingTime--;
                quantumCounter++;

                // Check for completion
                if (currentProcess.remainingTime === 0) {
                    currentProcess.completionTime = currentTime + 1;
                    completed.push(currentProcess);
                    currentProcess = null;
                    quantumCounter = 0;
                }
                // Check for Round Robin preemption
                else if (algorithm === 'rr' && quantumCounter === timeQuantum) {
                    readyQueue.push(currentProcess);
                    currentProcess = null;
                    quantumCounter = 0;
                }
            }
            
            // 4. Update all UI elements
            updateUI({
                currentTime: currentTime,
                readyQueue: readyQueue,
                cpuProcess: currentProcess,
                completed: completed
            });
            
            // 5. Wait for the next "tick"
            await delay(1000); // 1-second delay
            
            // 6. Increment time
            currentTime++;

            // 7. Safety break if nothing is happening
            if (currentProcess === null && readyQueue.length === 0 && completed.length < n) {
                let nextArrivalTime = Math.min(...processes.filter(p => p.arrival > currentTime).map(p => p.arrival));
                if (nextArrivalTime === Infinity) break;
                currentTime = nextArrivalTime;
            }
        }
        
        // Final UI update
        updateUI({
            currentTime: currentTime,
            readyQueue: readyQueue,
            cpuProcess: currentProcess,
            completed: completed
        });

        completed.forEach(p => {
            p.turnaroundTime = p.completionTime - p.arrival;
            p.waitingTime = p.turnaroundTime - p.burst;
        });
        
        return completed;
    }


    // --- 7. RESULTS & VISUALIZATION (Updated for Real-Time) ---

    function calculateMetrics(completedProcesses) {
        let totalWaitingTime = 0;
        let totalTurnaroundTime = 0;
        
        completedProcesses.forEach(p => {
            totalWaitingTime += p.waitingTime;
            totalTurnaroundTime += p.turnaroundTime;
        });

        const n = completedProcesses.length;
        return {
            avgWaitingTime: n > 0 ? totalWaitingTime / n : 0,
            avgTurnaroundTime: n > 0 ? totalTurnaroundTime / n : 0
        };
    }

    function updateMetrics(metrics) {
        avgWaitingTime.textContent = metrics.avgWaitingTime.toFixed(2);
        avgTurnaroundTime.textContent = metrics.avgTurnaroundTime.toFixed(2);
    }

    function initGanttChart(processes) {
        if (ganttChart) {
            ganttChart.destroy();
        }

        const pids = processes.map(p => p.pid).sort();
        const chartData = {
            labels: pids,
            datasets: pids.map(pid => ({
                label: pid,
                data: [],
                backgroundColor: getProcessColor(pid),
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                barPercentage: 0.8,
                categoryPercentage: 0.9
            }))
        };

        ganttChart = new Chart(ganttChartCanvas, {
            type: 'bar',
            data: chartData,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const start = context.raw[0];
                                const end = context.raw[1];
                                return `${context.dataset.label}: [${start}, ${end}] (Duration: ${end - start})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Time' },
                        min: 0,
                    },
                    y: {
                        title: { display: true, text: 'Process ID' }
                    }
                },
                animation: false
            }
        });

        return { pids, chartData };
    }

    /**
     * *** THIS IS THE FIXED FUNCTION ***
     * Updates the Gantt chart by merging consecutive time slices.
     */
    function updateGanttChart(pid, start, end, pids, chartData) {
        const datasetIndex = pids.indexOf(pid);
        if (datasetIndex === -1) return;

        const data = chartData.datasets[datasetIndex].data;
        
        // Check if we can merge with the last block
        if (data.length > 0) {
            const lastBlock = data[data.length - 1];
            
            // Check if the last block's end time is our start time
            // This means it's a continuous run
            if (lastBlock[1] === start) {
                // Merge by updating the last block's end time
                lastBlock[1] = end;
                ganttChart.update();
                return; // We are done
            }
        }
        
        // If it's a new block (not continuous, e.g., for Round Robin), just push it.
        data.push([start, end]);
        ganttChart.update();
    }

    /**
     * Generates a consistent color for a PID.
     */
    function getProcessColor(pid) {
        let hash = 0;
        for (let i = 0; i < pid.length; i++) {
            hash = pid.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        const color = "00000".substring(0, 6 - c.length) + c;
        return `#${color}B3`; // 70% opacity
    }
    
});