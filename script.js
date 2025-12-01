// Wait for the DOM to be fully loaded before running any script
document.addEventListener('DOMContentLoaded', () => {

    // --- SPLASH SCREEN LOGIC ---
    const overlay = document.getElementById('intro-overlay');
    
    // Wait for 2.5 seconds, then fade out
    if (overlay) {
        setTimeout(() => {
            overlay.classList.add('fade-out');
            
            // Remove from DOM completely after fade is done (0.8s later)
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 800); 
        }, 2500);
    }

    // --- 1. GLOBAL STATE ---
    let processList = [];   
    let pidCounter = 1;     
    let ganttChart = null;  
    let simulationRunning = false; 

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
    processForm.addEventListener('submit', runSimulation); 


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
        
        // SHOW the placeholder again when reset
        const placeholder = document.getElementById('chart-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
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
        console.table(processes);

        try {
            // HIDE the placeholder to show the chart
            const placeholder = document.getElementById('chart-placeholder');
            if (placeholder) placeholder.classList.add('hidden');

            const { pids, chartData } = initGanttChart(processes);
            const completedProcesses = await animateSimulation(processes, algorithm, timeQuantum, pids, chartData);
            const metrics = calculateMetrics(completedProcesses);
            updateMetrics(metrics);
            
            // SHOW NOTIFICATION
            showNotification("Output has been processed");

        } catch (error) {
            console.error("Simulation failed:", error);
            alert("An error occurred during the simulation.");
        } finally {
            simulationRunning = false;
            runSimulationBtn.disabled = false;
            runSimulationBtn.textContent = "Run Simulation";
        }
    }


    // --- 6. ANIMATION ENGINE ---

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createProcessPill(pid) {
        const pill = document.createElement('div');
        pill.classList.add('process-pill');
        pill.id = `pill-${pid}`;
        pill.textContent = pid;
        // Use neon color for the pill background
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

    async function animateSimulation(processes, algorithm, timeQuantum, pids, chartData) {
        let currentTime = 0;
        let currentProcess = null;
        let quantumCounter = 0;
        
        const readyQueue = [];
        const completed = [];
        const n = processes.length;

        // Sort initially by arrival time for cleaner processing (optional but good practice)
        processes.sort((a, b) => a.arrival - b.arrival);

        while (completed.length < n) {
            
            // 1. ARRIVALS: Check for arriving processes FIRST
            // This ensures new arrivals get into the queue BEFORE we preempt the current process.
            // Result: New Arrivals > Preempted Process (Classroom Logic)
            processes.forEach(p => {
                if (p.arrival === currentTime && !completed.find(c => c.pid === p.pid) && !readyQueue.find(r => r.pid === p.pid)) {
                    readyQueue.push(p);
                }
            });

            // 2. PREEMPTION: Check if the running process hit its Time Quantum
            // We do this HERE so the preempted process goes to the BACK of the line (behind new arrivals)
            if (currentProcess && algorithm === 'rr' && quantumCounter === timeQuantum) {
                readyQueue.push(currentProcess);
                currentProcess = null;
                quantumCounter = 0;
            }
            
            // 3. SELECTION: If CPU is idle, pick a process
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

                // Initialize start time if it's the first time running
                if (currentProcess.startTime === -1) {
                    currentProcess.startTime = currentTime;
                }
                
                // Reset quantum when a new process is picked (or resumed)
                // Note: quantumCounter is already reset to 0 in the preemption/completion blocks, 
                // but strictly ensuring it here is safe.
            }

            // 4. EXECUTION: Run the process for 1 tick
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
                // NOTE: The "else if (quantum === timeQuantum)" block was REMOVED from here
                // and moved to step 2.
            }
            
            // 5. UPDATE UI
            updateUI({
                currentTime: currentTime,
                readyQueue: readyQueue,
                cpuProcess: currentProcess,
                completed: completed
            });
            
            // 6. DELAY & TIME INCREMENT
            await delay(1000); 
            
            currentTime++;

            // 7. SAFETY: Skip idle time if needed
            if (currentProcess === null && readyQueue.length === 0 && completed.length < n) {
                let nextArrivalTime = Math.min(...processes.filter(p => p.arrival > currentTime).map(p => p.arrival));
                if (nextArrivalTime !== Infinity) {
                    // Fast forward UI time too if skipping
                     while (currentTime < nextArrivalTime) {
                        currentTime++;
                     }
                }
            }
        }
        
        // Final UI update
        updateUI({
            currentTime: currentTime,
            readyQueue: readyQueue,
            cpuProcess: currentProcess,
            completed: completed
        });

        // Calculate final stats
        completed.forEach(p => {
            p.turnaroundTime = p.completionTime - p.arrival;
            p.waitingTime = p.turnaroundTime - p.burst;
        });
        
        return completed;
    }


    // --- 7. RESULTS & VISUALIZATION ---

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
                borderColor: 'rgba(255, 255, 255, 0.2)', 
                borderWidth: 1,
                barPercentage: 0.5, 
                categoryPercentage: 0.9,
                borderRadius: 4
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
                        title: { display: true, text: 'Time', color: '#94a3b8' },
                        min: 0,
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                    },
                    y: {
                        title: { display: true, text: 'Process ID', color: '#94a3b8' },
                        ticks: { color: '#cbd5e1' },
                        grid: { display: false }
                    }
                },
                animation: false
            }
        });

        return { pids, chartData };
    }

    function updateGanttChart(pid, start, end, pids, chartData) {
        const datasetIndex = pids.indexOf(pid);
        if (datasetIndex === -1) return;

        const data = chartData.datasets[datasetIndex].data;
        
        if (data.length > 0) {
            const lastBlock = data[data.length - 1];
            if (lastBlock[1] === start) {
                lastBlock[1] = end;
                ganttChart.update();
                return;
            }
        }
        
        data.push([start, end]);
        ganttChart.update();
    }

    /**
     * Generates a NEON color based on the PID.
     * Uses HSL to ensure high saturation and lightness.
     */
    function getProcessColor(pid) {
        let hash = 0;
        for (let i = 0; i < pid.length; i++) {
            hash = pid.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Generate Hue from hash (0-360)
        const hue = Math.abs(hash % 360);
        
        // Fixed Saturation and Lightness for Neon effect
        // 100% Saturation, 60% Lightness, 0.9 Alpha
        return `hsla(${hue}, 100%, 60%, 0.9)`; 
    }

    // --- 8. NOTIFICATION HELPER ---
    function showNotification(message) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000); // Hide after 3 seconds
        }
    }
    
});