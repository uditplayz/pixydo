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
    checkbox.addEventListener("change", ()=>{
        todo.completed = checkbox.checked;

        // TODO: visual feedback strike-through when completed
        saveTodos();
    })

    // text of the todo
    const textSpan = document.createElement('span');
    textSpan.textContent = todo.text;
    textSpan.style.margin = '0 8px';
    if(todo.completed) {
        textSpan.style.textDecoration = 'line-through';
    }
        // add double-click event listener
        document.addEventListener("dblclick", ()=>{
            const newText = prompt("Edit todo", todo.text);
            if(newText !== null){
                todo.text = newText.trim();
                textSpan.textContent = todo.text;
                saveTodos();
            }
        })

        // delete todo button
        const dltBtn = document.createElement('button');
        dltBtn.textContent = "X";
        dltBtn.addEventListener("click", ()=>{
            todos.splice(index, 1);
            render();
            saveTodos();
        })

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(dltBtn);
        return li

}

// render the whole todo list from todos array
function render() {
    list.innerHTML = '';

    // recreate each time
    todos.forEach((todo, index) => {
        const node = createTodoNode(todo, index);
        list.appendChild(node)
    });
}

function addTodo(){
    const text = input.value.trim();
    if (!text){
        return;
    }

    // push a new todo object
    todos.push({text: text, completed: false});
    input.value = '';
    render();
    saveTodos();

}

addBtn.addEventListener("click", addTodo);
render();