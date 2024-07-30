// const USERNAME = "Albert"
let USERNAME
let game_id
let points = 1000;
let launch = document.querySelector(".launch")
let victory = document.querySelector(".victory")
let failure = document.querySelector(".failure")
let gameSettingsField = document.querySelector(".gameSettings")
document.querySelector(".victory").style.display = 'none';
document.querySelector(".failure").style.display = 'none';

document.getElementById('login').addEventListener('submit', function(event) {
    event.preventDefault();
    authorization()
})

checkLS()

function checkLS() {
    let login = localStorage.getItem('username')
    if (login) {
        USERNAME = login
        launch.classList.add('disabled')
        updateUserBalance()
    }
}

document.querySelector('header .exit').addEventListener('click', exit)
function exit() {
    localStorage.removeItem('username')
    launch.classList.remove('disabled')
}

async function authorization() {
    let login = document.getElementsByName("login")[0].value
    let response = await sendRequest("user", "GET", { // Отправляем запрос узнать баланс игрока
        username: login
    })
    if (response.error) {
        // Такой пользователь не зарегистрирован
        let registration = await sendRequest("user", "POST", {username: login}) //Отправляем запрос сообщить, зареган ли игрок
        if (registration.error) {
            alert(registration.message)
        }
        else {
            // Пользователь успешно зарегистрирован
            USERNAME = login
            launch.classList.add('disabled')
            updateUserBalance()
            localStorage.setItem('username', USERNAME)
        }
    }
    else {
        // Пользователь зарегистрирован
        USERNAME = login
        launch.classList.add('disabled')
        updateUserBalance()
        localStorage.setItem('username', USERNAME)
    }
}

async function updateUserBalance() {
    let response = await sendRequest("user", "GET", 
        {
            username: USERNAME
        })
    if (response.error) {
        // Произошла ошибка
        alert.apply(response.message)
    }
    else {
        let userBalance = response.balance
        let span = document.querySelector("header span")
        span.innerHTML = `[${USERNAME}, ${userBalance}]`
    }
}

async function sendRequest(url, method, data) {
    url = `https://tg-api.tehnikum.school/tehnikum_course/minesweeper/${url}`
    
    if(method == "POST") {
        let response = await fetch(url, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
    
        response = await response.json()
        return response
    } else if(method == "GET") {
        url = url+"?"+ new URLSearchParams(data)
        let response = await fetch(url, {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        response = await response.json()
        return response
    }
}
// выбор баллов, активация поля, флажки, очистка поля
document.querySelectorAll('.point').forEach( (btn) => {
    btn.addEventListener('click', setPoints)
})

function setPoints() {
    let userBtn =event.target
    points = +userBtn.innerHTML

    let activeBtn = document.querySelector('.point.active')
    activeBtn.classList.remove('active')

    userBtn.classList.add('active')
}
function activateArea() {
    let cells = document.querySelectorAll('.cell')
    cells.forEach( (cell, i) => {
        setTimeout( () => {
            cell.classList.add('active')
            cell.addEventListener('contextmenu', (event) =>{
                event.preventDefault() // предотвращаем стандартный вызов меню браузера
                setFlag() // вместо этого на правый клик вешаем функцию setFlag()
            })

            let row = Math.trunc(i/10) // Math.trunc() - отбрасывание остатка от меньшего целого числа: 3,7 - 3
            let column = i - row*10 
            cell.setAttribute('data-row', row)
            cell.setAttribute('data-column', column)

            cell.addEventListener('click', makeStep)
        }, i * 15)
    })
}

function setFlag() {
    let cell = event.target
    cell.classList.toggle('flag')
}

function cleanArea() {
    let gameField = document.querySelector('.gameField')
    gameField.innerHTML = ""

    for (let i =0; i < 80; i++) {
        let cell = document.createElement('div'); // Создаем элемент div с нуля, из ниоткуда
        cell.classList.add('cell'); // Добавляем класс cell
        gameField.appendChild(cell); // Добавляем ячейку в gameField 
    }
    // document.querySelector(".victory").style.display = 'none';
    // document.querySelector(".failure").style.display = 'none';
    // gameSettingsField.style.display = 'block';
}

// начало игры, окончание игры, игровой процесс
let gameBtn = document.getElementById('gameBtn')
gameBtn.addEventListener('click', startOrStopGame)

function startOrStopGame() {
    let btnText = gameBtn.innerHTML
    if (btnText == "Играть") {
        // Начать игру
        startGame()

        gameBtn.innerHTML = "Закончить игру"
    } else {
        // Закончить игру
        stopGame()

        gameBtn.innerHTML = "Играть"
    }
}

async function startGame() {
    let response = await sendRequest('new_game', 'POST', {
        'username': USERNAME,
        points // можно и так, вместо 'points': points,
    })
    if (response.error) {
        // Произошла ошибка
        alert(response.message)
        gameBtn.innerHTML = 'Играть'
    } else {
        // Игра началась успешно
        updateUserBalance()
        game_id = response.game_id
        activateArea()
        
        console.log(game_id)
    }
}

async function stopGame() {
    let response = await sendRequest('stop_game', 'POST', {
        'username': USERNAME,
        game_id // можно и так, вместо 'game_id': game_id,
    })
    if (response.error) {
        // Произошла ошибка
        alert(response.message)
        gameBtn.innerHTML = 'Зкончить игру'
    } else {
        // Игра закончилась успешно
        updateUserBalance()
        cleanArea()
    }
}

// игровой процесс
async function makeStep() {
    let cell = event.target
    let row = +cell.getAttribute('data-row')
    let column = +cell.getAttribute('data-column')
    console.log(row, column)

    let response = await sendRequest('game_step', 'POST', {
        game_id, row, column
    })

    if (response.error) {
        alert(response.message)
    }
    else {
        // Успешный ход
        updateArea(response.table)
        if (response.status == 'Ok') {
            // Играем дальше
        }
        else if (response.status == 'Failed') {
            // Напоролся на мину
            // alert("Вы проиграли!")
            showFailure()

            gameBtn.classList.add('disabled-button')
            gameBtn.innerHTML = "Играть"

            setTimeout ( () => {
                cleanArea()
                gameBtn.classList.remove('disabled-button')
            }, 5000)
        }
        else if (response.status == 'Won') {
            // Выиграл игру
            // alert("Вы выиграли!")
            showVictory()
            updateUserBalance()

            gameBtn.classList.add('disabled-button')
            gameBtn.innerHTML = "Играть"

            setTimeout ( () => {
                cleanArea()
                gameBtn.classList.remove('disabled-button')
            }, 5000)
        }
    }
}

function showGameSettings() {
    gameSettingsField.innerHTML = `
        <h2>Количество баллов</h2>
        <div class="score">
            <div class="point active">1000</div>
            <div class="point">2000</div>
            <div class="point">3000</div>
            <div class="point">5000</div>
            <div class="point">10000</div>
            <div class="point">Другое</div>
        </div>
        <button id="gameBtn">Играть</button>`;
    
    document.querySelectorAll('.point').forEach((btn) => {
        btn.addEventListener('click', setPoints);
    });
    
    document.getElementById('gameBtn').addEventListener('click', startOrStopGame);
    gameSettingsField.style.display = 'block';
}

function showFailure() {
    gameSettingsField.innerHTML = `
        <div class="failure">
            <h3>Бум! Вы проиграли!</h3>
            <button id="newGame">Продолжить</button>
        </div>`;
    document.getElementById("newGame").addEventListener('click', () => {
        cleanArea();
        showGameSettings();
    });
    gameSettingsField.style.display = "block";
}

function showVictory() {
    gameSettingsField.innerHTML = `
        <div class="victory">
            <h3>Поздравляем! Вы победили!</h3>
            <button id="newGame">Продолжить</button>
        </div>`;
    document.getElementById("newGame").addEventListener('click', () => {
        cleanArea();
        showGameSettings();
    });
    gameSettingsField.style.display = "block";
}

function updateArea(table) {
    // Какие могут быть значения у ячейки (переменная value)
    // BOMB
    // 0
    // 1234567890
    let cells = document.querySelectorAll('.cell')

    let a = 0 //  номер ячейки
    for (let i = 0; i < table.length; i++)
         {
            // проходимся по рядам
            let row = table[i]
            for (let j = 0; j < row.length; j++) {
                // проходимся по ячейкам в ряду
                let value = row[j]
                let cell = cells[a]
                if(value ==='BOMB') {
                    cell.classList.remove('active')
                    cell.classList.add('bomb')
                }
                else if(value === "") {

                }
                else if(value === 0) {
                    cell.classList.remove('active')
                }
                else if(value > 0) {
                    cell.classList.remove('active')
                    cell.innerHTML = value
                }
                a++
            }
         }
}
