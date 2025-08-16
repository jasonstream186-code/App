document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const scheduleDisplay = document.getElementById('schedule-display');
    const assignmentsList = document.getElementById('assignments-list');
    const addClassBtn = document.getElementById('add-class');
    const addAssignmentBtn = document.getElementById('add-assignment');
    const classModal = document.getElementById('class-modal');
    const assignmentModal = document.getElementById('assignment-modal');
    const classForm = document.getElementById('class-form');
    const assignmentForm = document.getElementById('assignment-form');
    const notifyBtn = document.getElementById('notify-btn');
    const notifyStatus = document.getElementById('notify-status');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const closeBtns = document.querySelectorAll('.close');
    
    // Data
    let classes = JSON.parse(localStorage.getItem('classes')) || [];
    let assignments = JSON.parse(localStorage.getItem('assignments')) || [];
    
    // Initialize
    renderSchedule();
    renderAssignments();
    checkNotificationPermission();
    
    // Event Listeners
    addClassBtn.addEventListener('click', () => classModal.style.display = 'flex');
    addAssignmentBtn.addEventListener('click', () => assignmentModal.style.display = 'flex');
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            classModal.style.display = 'none';
            assignmentModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === classModal) classModal.style.display = 'none';
        if (e.target === assignmentModal) assignmentModal.style.display = 'none';
    });
    
    classForm.addEventListener('submit', handleClassSubmit);
    assignmentForm.addEventListener('submit', handleAssignmentSubmit);
    
    notifyBtn.addEventListener('click', requestNotificationPermission);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
    
    // Functions
    function renderSchedule() {
        // Clear existing
        scheduleDisplay.innerHTML = '';
        
        // Create headers
        const days = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'schedule-header';
            header.textContent = day;
            scheduleDisplay.appendChild(header);
        });
        
        // Create time slots (8am to 8pm)
        for (let hour = 8; hour <= 20; hour++) {
            const timeCell = document.createElement('div');
            timeCell.className = 'time-slot';
            timeCell.textContent = `${hour}:00`;
            scheduleDisplay.appendChild(timeCell);
            
            // Create cells for each day
            for (let i = 0; i < 5; i++) {
                const cell = document.createElement('div');
                cell.className = 'class-cell';
                cell.dataset.day = days[i+1];
                cell.dataset.time = hour;
                
                // Check if there's a class at this time
                const matchingClass = classes.find(c => 
                    c.day === days[i+1] && 
                    parseInt(c.time.split(':')[0]) === hour
                );
                
                if (matchingClass) {
                    cell.textContent = matchingClass.name;
                    cell.title = `${matchingClass.name}\n${matchingClass.time} (${matchingClass.duration}hrs)`;
                    cell.addEventListener('click', () => editClass(matchingClass.id));
                } else {
                    cell.addEventListener('click', () => addClassAt(days[i+1], hour));
                }
                
                scheduleDisplay.appendChild(cell);
            }
        }
    }
    
    function renderAssignments() {
        assignmentsList.innerHTML = '';
        
        // Sort by due date
        assignments.sort((a, b) => new Date(a.due) - new Date(b.due));
        
        assignments.forEach(assignment => {
            const item = document.createElement('div');
            item.className = 'assignment-item';
            
            const dueDate = new Date(assignment.due);
            const now = new Date();
            const isOverdue = dueDate < now;
            
            item.innerHTML = `
                <div>
                    <strong>${assignment.name}</strong>
                    <div>${assignment.course}</div>
                </div>
                <div class="assignment-due" style="color: ${isOverdue ? '#e74c3c' : '#2c3e50'}">
                    Due: ${formatDate(dueDate)}
                </div>
                <button class="delete-btn" data-id="${assignment.id}">Delete</button>
            `;
            
            assignmentsList.appendChild(item);
            
            // Add delete event
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteAssignment(assignment.id);
            });
            
            // Add click to edit
            item.addEventListener('click', () => editAssignment(assignment.id));
        });
    }
    
    function handleClassSubmit(e) {
        e.preventDefault();
        
        const classData = {
            id: Date.now().toString(),
            name: document.getElementById('class-name').value,
            day: document.getElementById('class-day').value,
            time: document.getElementById('class-time').value,
            duration: document.getElementById('class-duration').value
        };
        
        classes.push(classData);
        saveClasses();
        renderSchedule();
        classModal.style.display = 'none';
        classForm.reset();
    }
    
    function handleAssignmentSubmit(e) {
        e.preventDefault();
        
        const assignmentData = {
            id: Date.now().toString(),
            name: document.getElementById('assignment-name').value,
            course: document.getElementById('assignment-course').value,
            due: document.getElementById('assignment-due').value
        };
        
        assignments.push(assignmentData);
        saveAssignments();
        renderAssignments();
        assignmentModal.style.display = 'none';
        assignmentForm.reset();
        
        // Schedule notification
        scheduleAssignmentNotification(assignmentData);
    }
    
    function addClassAt(day, hour) {
        classModal.style.display = 'flex';
        document.getElementById('class-day').value = day;
        document.getElementById('class-time').value = `${hour.toString().padStart(2, '0')}:00`;
    }
    
    function editClass(id) {
        const cls = classes.find(c => c.id === id);
        if (!cls) return;
        
        document.getElementById('class-name').value = cls.name;
        document.getElementById('class-day').value = cls.day;
        document.getElementById('class-time').value = cls.time;
        document.getElementById('class-duration').value = cls.duration;
        
        // Remove the old class
        classes = classes.filter(c => c.id !== id);
        
        classModal.style.display = 'flex';
    }
    
    function editAssignment(id) {
        const assignment = assignments.find(a => a.id === id);
        if (!assignment) return;
        
        document.getElementById('assignment-name').value = assignment.name;
        document.getElementById('assignment-course').value = assignment.course;
        document.getElementById('assignment-due').value = assignment.due.split('.').slice(0, -1).join('');
        
        // Remove the old assignment
        assignments = assignments.filter(a => a.id !== id);
        
        assignmentModal.style.display = 'flex';
    }
    
    function deleteAssignment(id) {
        if (confirm('Delete this assignment?')) {
            assignments = assignments.filter(a => a.id !== id);
            saveAssignments();
            renderAssignments();
        }
    }
    
    function saveClasses() {
        localStorage.setItem('classes', JSON.stringify(classes));
    }
    
    function saveAssignments() {
        localStorage.setItem('assignments', JSON.stringify(assignments));
    }
    
    function formatDate(date) {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Notification Functions
    function checkNotificationPermission() {
        if (!('Notification' in window)) {
            notifyStatus.textContent = 'Notifications not supported';
            notifyBtn.style.display = 'none';
            return;
        }
        
        if (Notification.permission === 'granted') {
            notifyStatus.textContent = 'Notifications enabled';
            notifyBtn.style.display = 'none';
        } else if (Notification.permission === 'denied') {
            notifyStatus.textContent = 'Notifications blocked';
            notifyBtn.style.display = 'none';
        } else {
            notifyStatus.textContent = '';
            notifyBtn.style.display = 'inline-block';
        }
    }
    
    function requestNotificationPermission() {
        Notification.requestPermission().then(permission => {
            checkNotificationPermission();
            if (permission === 'granted') {
                // Schedule notifications for existing assignments
                assignments.forEach(scheduleAssignmentNotification);
            }
        });
    }
    
    function scheduleAssignmentNotification(assignment) {
        if (Notification.permission !== 'granted') return;
        
        const dueDate = new Date(assignment.due);
        const now = new Date();
        
        // Don't schedule for past assignments
        if (dueDate < now) return;
        
        // Schedule for 1 hour before
        const notifyTime = dueDate.getTime() - (60 * 60 * 1000);
        const timeUntilNotify = notifyTime - now.getTime();
        
        if (timeUntilNotify > 0) {
            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification('Assignment Due Soon', {
                        body: `${assignment.name} for ${assignment.course} is due in 1 hour!`
                    });
                }
            }, time