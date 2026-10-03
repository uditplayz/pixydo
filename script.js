// Select Dom Elements
const input = document.getElementById("todo-input");
const addBtn = document.getElementById("add-todo-btn");
const list = document.getElementById("todo-list");

// try to load saved todos from local storage (if any)
const todos = localStorage.getItem('todos');
const todos = saved? JSON.parse(saved) : [];


function saveTodos() {
    // save current todos array to local storage
    localStorage.setItem('todos', JSON.stringify(todos));

}

// create a DOM mode for a todo object and append it to the list
function createTodoNode(todo, index) {
    const li = document.createElement('li');

    // checkbox to toggle completion
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.completed;
}

// render the whole todo list from todos array
function render() {
    list.innerHTML = '';

    // recreate each time
    todos.forEach(todo, index) => {
        const node = createTodoNode(todo, index);
        list.appendChild(node)
    }
}