// Генерация актуальной даты
const today = new Date();
const options = { day: 'numeric', month: 'long' }; // например: "11 декабря"
const formattedDate = today.toLocaleDateString('ru-RU', options);

// Вставка даты в HTML
document.getElementById('current-date').innerText = formattedDate;

// Кнопка "Перейти на сайт"
document.querySelector('.start-btn').addEventListener('click', () => {
  alert('Сайт скоро откроется!');
});

// Загрузка прогресса из localStorage
let progress = JSON.parse(localStorage.getItem('rggProgress')) || {
  visited: [],
  selected: null,
  inventory: [],
  position: 1, // позиция основного персонажа
  friends: [] // массив друзей: [{ name, position }, ...]
};

// Функция обновления инвентаря
function updateInventory() {
  const inventoryList = document.getElementById('inventory-list');
  if (progress.inventory.length === 0) {
    inventoryList.innerText = 'Пока пусто';
    return;
  }

  inventoryList.innerHTML = '';
  progress.inventory.forEach(num => {
    const item = document.createElement('div');
    item.classList.add('inventory-item');
    item.innerText = `Сундук #${num}`;
    inventoryList.appendChild(item);
  });
}

// Вызов при загрузке
updateInventory();

// Генерация карты из JSON
const mapContainer = document.getElementById('map-container');

// Создаём основного персонажа
const player = document.createElement('div');
player.classList.add('player');
player.innerHTML = '👤'; // можно заменить на пиксельный спрайт
player.style.position = 'absolute';
player.style.transition = 'left 0.5s ease, top 0.5s ease';
player.style.fontSize = '16px';
player.style.zIndex = '20';
player.style.pointerEvents = 'none'; // чтобы не мешал кликам
mapContainer.appendChild(player);

// Функция обновления позиции персонажа на карте
function updatePlayerPosition() {
  const currentCell = document.querySelector(`.cell[data-number="${progress.position}"]`);
  if (currentCell) {
    const rect = currentCell.getBoundingClientRect();
    const containerRect = mapContainer.getBoundingClientRect();
    player.style.left = `${rect.left - containerRect.left}px`;
    player.style.top = `${rect.top - containerRect.top}px`;

    // Отправляем позицию на сервер
    sendPositionToServer(progress.position);
  }
}

// Изначально ставим персонажа на старт
updatePlayerPosition();

// Функция обновления позиций друзей
function updateFriendPositions() {
  // Удаляем старых друзей
  document.querySelectorAll('.friend-player').forEach(el => el.remove());

  progress.friends.forEach(friend => {
    const currentCell = document.querySelector(`.cell[data-number="${friend.position}"]`);
    if (currentCell) {
      const friendEl = document.createElement('div');
      friendEl.classList.add('friend-player');
      friendEl.innerHTML = '👥'; // иконка друга
      friendEl.style.color = '#ff00ff'; // цвет для друга
      const rect = currentCell.getBoundingClientRect();
      const containerRect = mapContainer.getBoundingClientRect();
      friendEl.style.left = `${rect.left - containerRect.left}px`;
      friendEl.style.top = `${rect.top - containerRect.top}px`;
      mapContainer.appendChild(friendEl);
    }
  });
}

// Обновляем позиции друзей при загрузке
updateFriendPositions();

// Обработчик кнопки "Добавить друга"
document.getElementById('add-friend-btn').addEventListener('click', () => {
  const name = document.getElementById('friend-name').value.trim();
  if (!name) {
    alert('Введите имя друга');
    return;
  }

  // Добавляем друга с начальной позицией (например, на старт)
  progress.friends.push({ name, position: 1 });
  localStorage.setItem('rggProgress', JSON.stringify(progress));

  // Обновляем список друзей
  updateFriendsList();
  // Обновляем позиции
  updateFriendPositions();

  // Очищаем поле
  document.getElementById('friend-name').value = '';
});

// Функция обновления списка друзей
function updateFriendsList() {
  const list = document.getElementById('friends-list');
  list.innerHTML = '';
  if (progress.friends.length === 0) {
    list.innerText = 'Нет друзей';
    return;
  }

  progress.friends.forEach((friend, index) => {
    const item = document.createElement('div');
    item.classList.add('friends-list-item');
    item.innerText = `${friend.name} (клетка ${friend.position})`;
    list.appendChild(item);
  });
}

// Вызов при загрузке
updateFriendsList();

// WebSocket
let ws = null;

function connectToServer() {
  try {
    ws = new WebSocket('wss://rgg-backend.onrender.com');

    ws.onopen = () => {
      console.log('Соединение с сервером установлено');
      // ✅ Отправляем ТОЛЬКО здесь
      ws.send(JSON.stringify({
        type: 'join',
        roomId: 'room1',
        playerName: 'Player1'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'players') {
        updateOtherPlayers(data.players);
      }
    };

    ws.onerror = (error) => {
      console.error('Ошибка WebSocket:', error);
    };

    ws.onclose = () => {
      console.log('Соединение с сервером закрыто');
    };
  } catch (e) {
    console.warn('Не удалось создать WebSocket:', e);
  }
}

connectToServer();

connectToServer();
// Функция отправки позиции на сервер
function sendPositionToServer(position) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'move',
      position: position
    }));
  }
}

// Просто подключаемся к серверу (если нужно)
connectToServer();

// Функция обновления других игроков
function updateOtherPlayers(players) {
  // Удаляем старых
  document.querySelectorAll('.other-player').forEach(el => el.remove());

  for (const name in players) {
    if (name === 'Player1') continue; // не показываем себя

    const playerData = players[name];
    const currentCell = document.querySelector(`.cell[data-number="${playerData.position}"]`);

    if (currentCell) {
      const otherPlayer = document.createElement('div');
      otherPlayer.classList.add('other-player');
      otherPlayer.innerHTML = '👤'; // можно использовать другую иконку
      otherPlayer.style.color = '#00ffff';
      otherPlayer.style.position = 'absolute';
      otherPlayer.style.fontSize = '12px';
      otherPlayer.style.zIndex = '19';
      otherPlayer.style.pointerEvents = 'none';

      const rect = currentCell.getBoundingClientRect();
      const containerRect = mapContainer.getBoundingClientRect();
      otherPlayer.style.left = `${rect.left - containerRect.left}px`;
      otherPlayer.style.top = `${rect.top - containerRect.top}px`;

      mapContainer.appendChild(otherPlayer);
    }
  }
}

// Генерация сетки 30x20
for (let y = 0; y < 20; y++) {
  for (let x = 0; x < 30; x++) {
    const index = y * 30 + x;
    const data = cellData[index];

    if (!data) continue;

    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.number = data.number;
    cell.dataset.x = x;
    cell.dataset.y = y;
    cell.dataset.type = data.type;
    cell.dataset.region = data.region;

    cell.style.backgroundColor = data.color;

    // Номер клетки
    const numberSpan = document.createElement('span');
    numberSpan.classList.add('cell-number');
    numberSpan.innerText = data.number;
    cell.appendChild(numberSpan);

    // Иконка
    if (data.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.classList.add('cell-icon');
      iconSpan.innerText = data.icon;
      cell.appendChild(iconSpan);
    }

    // Подсказка
    cell.title = data.description;

    // Подсветка посещённой клетки
    if (progress.visited.includes(data.number)) {
      cell.style.opacity = '0.7';
      cell.style.filter = 'grayscale(50%)';
    }

    // Обработчик клика
    cell.addEventListener('click', () => {
      const clickedNumber = parseInt(cell.dataset.number);

      // Обновляем позицию
      progress.position = clickedNumber;

      // Анимация перемещения
      updatePlayerPosition();

      // Сохраняем прогресс
      localStorage.setItem('rggProgress', JSON.stringify(progress));

      // Добавляем в посещённые
      if (!progress.visited.includes(clickedNumber)) {
        progress.visited.push(clickedNumber);
      }

      // Открытие сундука
      if (data.type === 'chest' && !progress.inventory.includes(clickedNumber)) {
        alert(`Открыт сундук на клетке ${clickedNumber}!`);
        progress.inventory.push(clickedNumber);
        updateInventory();
      }

      // Обновляем стиль клетки
      cell.style.opacity = '0.7';
      cell.style.filter = 'grayscale(50%)';
    });

    // Обработчик наведения — убираем подсветку маршрутов
    cell.addEventListener('mouseenter', () => {
      document.querySelectorAll('.available-route').forEach(el => el.classList.remove('available-route'));
    });

    mapContainer.appendChild(cell);
  }
}

// Восстанавливаем выделенную клетку
if (progress.selected) {
  const selectedCell = document.querySelector(`.cell[data-number="${progress.selected}"]`);
  if (selectedCell) {
    selectedCell.classList.add('selected');
    document.getElementById('selected-cell').innerText = progress.selected;
  }
}

// Масштабирование карты
let scale = 1;
mapContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    scale -= 0.1;
  } else {
    scale += 0.1;
  }
  scale = Math.max(0.5, Math.min(2, scale));
  mapContainer.style.transform = `scale(${scale})`;
  // Обновляем позиции персонажей при масштабе
  setTimeout(updatePlayerPosition, 10);
  setTimeout(updateFriendPositions, 10);
});