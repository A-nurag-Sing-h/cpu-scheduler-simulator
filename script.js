// Wait for the DOM to be fully loaded before running any script
document.addEventListener('DOMContentLoaded', () => {

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
    }

    // --- 5. SIMULATION PREPARATION (Infrastructure) ---

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

        // Prepare the processes (Deep Copy)
        const processes = JSON.parse(JSON.stringify(processList)).map(p => ({
            ...p,
            remainingTime: p.burst,
            startTime: -1,
            completionTime: 0,
            waitingTime: 0,
            turnaroundTime: 0
        }));

        console.log("Starting simulation with:", processes);
        
        // TODO: In the next commit, we will call animateSimulation() here
        // For now, we just unlock the button after a small delay to simulate work
        setTimeout(() => {
            simulationRunning = false;
            runSimulationBtn.disabled = false;
            runSimulationBtn.textContent = "Run Simulation";
            alert("Simulation infrastructure is ready! Algorithms coming in next commit.");
        }, 1000);
    }


    // --- 6. ANIMATION HELPERS ---

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createProcessPill(pid) {
        const pill = document.createElement('div');
        pill.classList.add('process-pill');
        pill.id = `pill-${pid}`;
        pill.textContent = pid;
        // We will add dynamic colors later
        pill.style.backgroundColor = '#007bff'; 
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

});