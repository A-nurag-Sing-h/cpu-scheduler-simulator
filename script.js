// Wait for the DOM to be fully loaded before running any script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE ---
    let processList = [];   // Array to store all process objects
    let pidCounter = 1;     // Counter for unique Process IDs
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
    
    // UI Elements (We will use these in later commits)
    const readyQueueProcesses = document.getElementById('ready-queue-processes');
    const cpuProcessHolder = document.getElementById('cpu-process');
    const completedProcessesList = document.getElementById('completed-processes-list');
    const simulationTime = document.getElementById('simulation-time');

    // --- 3. EVENT LISTENERS ---
    addProcessBtn.addEventListener('click', addProcess);
    clearProcessesBtn.addEventListener('click', clearProcesses);
    algorithmSelect.addEventListener('change', toggleTimeQuantum);
    processForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert("Simulation logic will be added in the next commit!");
    });

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
    }

    function toggleTimeQuantum() {
        if (algorithmSelect.value === 'rr') {
            timeQuantumGroup.style.display = 'flex';
        } else {
            timeQuantumGroup.style.display = 'none';
        }
    }
});