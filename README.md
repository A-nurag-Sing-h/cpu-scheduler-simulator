Intelligent CPU Scheduler Simulator

Course: CSE 316: Operating Systems

Assignment: Academic Task-2 (CA Component)

📄 Project Overview
The Intelligent CPU Scheduler Simulator is a web-based educational tool designed to visualize the internal working mechanisms of an Operating System's CPU scheduler. CPU scheduling is a fundamental concept in OS management, determining which process runs when there are multiple processes in the ready queue.
This simulator bridges the gap between theoretical concepts and practical understanding by providing a real-time, interactive visualization of how processes move between the Ready Queue, CPU, and Completed state.

🚀 Features
Real-Time Animation Engine:
Visualizes the CPU cycle tick-by-tick (1 second per tick).
Shows processes moving dynamically between queues.
Provides a "System Idle" animation when the CPU is waiting for work.

Dynamic Gantt Chart:
Builds a solid-bar Gantt chart live as the simulation runs using Chart.js.
Merges continuous time slices into single blocks for a clean visualization.

Comprehensive Algorithm Support:
Supports FCFS, SJF (Non-Preemptive), Priority (Non-Preemptive), and Round Robin.

Interactive Input:
Add, remove, and configure processes with custom Arrival Time, Burst Time, and Priority.
Dynamically configure Time Quantum for Round Robin.

Automatic Metrics:
Instantly calculates and displays Average Waiting Time and Average Turnaround Time upon completion.

Modern UI/UX:
Dark Mode with Neon accents for a "Cyberpunk/High-Tech" aesthetic.
Responsive layout that works on desktop and mobile.

🧠 Supported Algorithms

First-Come, First-Served (FCFS):
Processes are executed in the exact order of their arrival.
Simple FIFO queue logic.

Shortest Job First (SJF) - Non-Preemptive:
The process with the shortest burst time in the ready queue is selected next.
Minimizes average waiting time.

Priority Scheduling - Non-Preemptive:
The process with the highest priority (lowest number) is selected next.
0 is considered the highest priority.

Round Robin (RR):
Processes are executed in a cyclic way using a fixed Time Quantum.
Implements Preemption: If a process exceeds its quantum, it is moved to the back of the queue.

🛠️ Technology Stack

Frontend: HTML5, CSS3

Logic: JavaScript (ES6+) with Async/Await for simulation timing.

Visualization: Chart.js library.

Styling: Custom CSS with Flexbox, Grid, and Keyframe Animations.

🔧 Installation & Usage

Clone the Repository:

git clone [https://github.com/A-nurag-Sing-h/cpu-scheduler-simulator.git](https://github.com/A-nurag-Sing-h/cpu-scheduler-simulator.git)


Navigate to the Folder:
cd cpu-scheduler-simulator


Run the Project:
Simply double-click the index.html file to open it in your web browser (Chrome, Edge, Firefox, Safari).
No server setup or backend installation is required.

📂 Project Structure

cpu-scheduler-simulator/
│
├── index.html          # Main HTML structure and layout
├── style.css           # CSS styling (Dark Theme, Animations, Responsive Design)
├── script.js           # Core simulation engine, algorithm logic, and Chart.js integration
└── README.md           # Project documentation


🔮 Future Scope
Preemptive SJF/Priority: Implementing Shortest Remaining Time First (SRTF) and Preemptive Priority.
I/O Bursts: Adding support for processes that have I/O operations in between CPU bursts.
Comparison Mode: Running two algorithms side-by-side to compare efficiency.
Step-by-Step Mode: Adding a "Next Step" button to manually control the simulation tick.

👥 Contributors

Anurag Singh
