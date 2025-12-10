// تعریف نمادها و مقادیر آنها
const SYMBOLS = {
    '🍒': { name: 'گیلاس', value: 5, color: '#e74c3c' },
    '🍋': { name: 'لیمو', value: 10, color: '#f1c40f' },
    '🍊': { name: 'پرتقال', value: 15, color: '#e67e22' },
    '⭐': { name: 'ستاره', value: 20, color: '#9b59b6', isScatter: true },
    '🔔': { name: 'زنگ', value: 25, color: '#3498db' },
    '7️⃣': { name: 'هفت', value: 50, color: '#2ecc71' },
    '💎': { name: 'الماس', value: 100, color: '#3498db', isWild: true },
    '🍉': { name: 'هندوانه', value: 30, color: '#27ae60' }
};

// جدول پرداخت‌ها
const PAYOUT_TABLE = {
    '🍒': { 3: 20, 4: 50, 5: 200 },
    '🍋': { 3: 30, 4: 75, 5: 300 },
    '🍊': { 3: 40, 4: 100, 5: 400 },
    '⭐': { 3: 100, 4: 250, 5: 1000 },
    '🔔': { 3: 60, 4: 150, 5: 600 },
    '7️⃣': { 3: 200, 4: 500, 5: 2000 },
    '💎': { 3: 500, 4: 1500, 5: 5000 },
    '🍉': { 3: 50, 4: 125, 5: 500 }
};

// حالت بازی
const gameState = {
    balance: 1000,
    spinCount: 0,
    score: 0,
    totalWins: 0,
    currentBet: 10,
    isSpinning: false,
    autoSpin: false,
    freeSpins: 0,
    multiplier: 1,
    jackpot: 5000,
    jackpotProgress: 0,
    theme: 'gold',
    winHistory: []
};

// ذخیره بازی در localStorage
function saveGame() {
    localStorage.setItem('slotMachineGame', JSON.stringify(gameState));
}

// بارگذاری بازی از localStorage
function loadGame() {
    const saved = localStorage.getItem('slotMachineGame');
    if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(gameState, loaded);
        updateUI();
    }
}

// مقداردهی اولیه بازی
function initGame() {
    loadGame();
    createReels(5, 3); // 5 ستون، 3 ردیف
    updatePayoutTable();
    setupEventListeners();
    updateUI();
    
    // بارگذاری تم
    setTheme(gameState.theme);
}

// ایجاد ریل‌ها
function createReels(columns, rows) {
    const reelsContainer = document.getElementById('reels');
    reelsContainer.innerHTML = '';
    
    for (let col = 0; col < columns; col++) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'reel-column';
        columnDiv.dataset.column = col;
        
        for (let row = 0; row < rows; row++) {
            const symbolDiv = document.createElement('div');
            symbolDiv.className = 'symbol';
            symbolDiv.dataset.column = col;
            symbolDiv.dataset.row = row;
            
            // انتخاب تصادفی نماد اولیه
            const symbols = Object.keys(SYMBOLS);
            const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            symbolDiv.textContent = randomSymbol;
            symbolDiv.style.color = SYMBOLS[randomSymbol].color;
            
            columnDiv.appendChild(symbolDiv);
        }
        
        reelsContainer.appendChild(columnDiv);
    }
}

// به‌روزرسانی جدول پرداخت‌ها
function updatePayoutTable() {
    const tbody = document.getElementById('payout-body');
    tbody.innerHTML = '';
    
    Object.entries(PAYOUT_TABLE).forEach(([symbol, pays]) => {
        const row = document.createElement('tr');
        
        const symbolCell = document.createElement('td');
        symbolCell.textContent = symbol;
        symbolCell.style.fontSize = '1.5rem';
        row.appendChild(symbolCell);
        
        [3, 4, 5].forEach(count => {
            const cell = document.createElement('td');
            cell.textContent = pays[count] || '-';
            cell.style.color = '#f1c40f';
            cell.style.fontWeight = 'bold';
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

// چرخش ریل‌ها
function spinReels() {
    if (gameState.isSpinning) return;
    
    // بررسی موجودی
    if (gameState.balance < gameState.currentBet && gameState.freeSpins === 0) {
        showNotification('موجودی کافی نیست!');
        return;
    }
    
    // کم کردن شرط از موجودی (مگر در چرخش رایگان)
    if (gameState.freeSpins === 0) {
        gameState.balance -= gameState.currentBet;
    } else {
        gameState.freeSpins--;
        updateFreeSpins();
    }
    
    // پخش صدای چرخش
    playSound('spin');
    
    // فعال کردن حالت چرخش
    gameState.isSpinning = true;
    gameState.spinCount++;
    
    // به‌روزرسانی دکمه‌ها
    document.getElementById('spin-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    
    // پنهان کردن خطوط برنده قبلی
    document.querySelectorAll('.payline').forEach(line => {
        line.classList.remove('active');
    });
    
    // پنهان کردن برد قبلی
    document.getElementById('current-win').innerHTML = '';
    
    // سرعت چرخش
    const speed = document.getElementById('spin-speed').value;
    const spinDuration = 2000 - (speed * 150); // 500ms تا 2000ms
    
    // چرخش هر ستون
    const columns = document.querySelectorAll('.reel-column');
    let columnsStopped = 0;
    
    columns.forEach((column, colIndex) => {
        const symbols = column.querySelectorAll('.symbol');
        
        // انیمیشن چرخش
        column.style.transition = `transform ${spinDuration}ms cubic-bezier(0.1, 0.7, 0.1, 1)`;
        column.style.transform = 'translateY(-1000px)';
        
        // توقف چرخش هر ستون در زمان‌های مختلف
        setTimeout(() => {
            stopColumn(column, colIndex);
            
            columnsStopped++;
            if (columnsStopped === columns.length) {
                finishSpin();
            }
        }, spinDuration - 500 + (colIndex * 200));
    });
    
    updateUI();
}

// توقف یک ستون
function stopColumn(column, colIndex) {
    const symbols = column.querySelectorAll('.symbol');
    const symbolKeys = Object.keys(SYMBOLS);
    
    symbols.forEach((symbolDiv, rowIndex) => {
        // انتخاب نماد نهایی (با احتمال خاص برای نمادهای ویژه)
        let randomSymbol;
        const rand = Math.random();
        
        if (rand < 0.02) { // 2% شانس برای الماس
            randomSymbol = '💎';
        } else if (rand < 0.05) { // 3% شانس برای ستاره
            randomSymbol = '⭐';
        } else if (rand < 0.1) { // 5% شانس برای هفت
            randomSymbol = '7️⃣';
        } else {
            randomSymbol = symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
        }
        
        // تأخیر برای هر سطر برای افکت آبشاری
        setTimeout(() => {
            symbolDiv.textContent = randomSymbol;
            symbolDiv.style.color = SYMBOLS[randomSymbol].color;
            symbolDiv.classList.remove('win');
            
            // بازنشانی موقعیت
            column.style.transition = 'none';
            column.style.transform = 'translateY(0)';
            
            // کمی تأخیر برای بازنشانی طبیعی
            setTimeout(() => {
                column.style.transition = 'transform 0.3s ease';
            }, 50);
            
        }, rowIndex * 100);
    });
}

// پایان چرخش
function finishSpin() {
    gameState.isSpinning = false;
    
    // به‌روزرسانی دکمه‌ها
    document.getElementById('spin-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
    
    // بررسی برد
    checkWins();
    
    // به‌روزرسانی پیشرفت جکپات
    updateJackpotProgress();
    
    // ذخیره بازی
    saveGame();
    
    // اگر حالت چرخش خودکار فعال است
    if (gameState.autoSpin && gameState.balance >= gameState.currentBet) {
        setTimeout(spinReels, 1000);
    }
}

// بررسی بردها
function checkWins() {
    const reels = getReelSymbols();
    let totalWin = 0;
    const winningLines = [];
    
    // خطوط برنده (ردیف‌ها)
    const lines = [
        [ [0,0], [1,0], [2,0], [3,0], [4,0] ], // خط 1 (بالا)
        [ [0,1], [1,1], [2,1], [3,1], [4,1] ], // خط 2 (وسط)
        [ [0,2], [1,2], [2,2], [3,2], [4,2] ], // خط 3 (پایین)
        [ [0,0], [1,1], [2,2], [3,1], [4,0] ], // خط 4 (مورب V)
        [ [0,2], [1,1], [2,0], [3,1], [4,2] ]  // خط 5 (مورب ^)
    ];
    
    // بررسی هر خط
    lines.forEach((line, lineIndex) => {
        const lineSymbols = line.map(([col, row]) => reels[col][row]);
        const winResult = checkLineWin(lineSymbols);
        
        if (winResult.win > 0) {
            totalWin += winResult.win * gameState.multiplier;
            winningLines.push({
                line: lineIndex,
                symbol: winResult.symbol,
                count: winResult.count,
                win: winResult.win * gameState.multiplier
            });
            
            // نمایش خط برنده
            document.querySelectorAll('.payline')[lineIndex].classList.add('active');
            
            // هایلایت نمادهای برنده
            line.forEach(([col, row]) => {
                const symbolDiv = document.querySelector(`.symbol[data-column="${col}"][data-row="${row}"]`);
                symbolDiv.classList.add('win');
            });
        }
    });
    
    // بررسی نمادهای Scatter
    const scatterCount = countScatters(reels);
    if (scatterCount >= 3) {
        const scatterWin = scatterCount === 3 ? 100 : scatterCount === 4 ? 250 : 1000;
        totalWin += scatterWin;
        
        // اضافه کردن چرخش رایگان
        gameState.freeSpins += 10;
        updateFreeSpins();
        
        winningLines.push({
            symbol: '⭐',
            count: scatterCount,
            win: scatterWin,
            type: 'scatter',
            freeSpins: 10
        });
    }
    
    // به‌روزرسانی برد
    if (totalWin > 0) {
        gameState.balance += totalWin;
        gameState.totalWins++;
        gameState.score += totalWin;
        
        // پخش صدای برد
        playSound('win');
        
        // نمایش برد
        showWin(totalWin, winningLines);
        
        // اضافه کردن به تاریخچه
        addToHistory(totalWin, winningLines);
        
        // بررسی جکپات
        if (totalWin >= gameState.jackpot) {
            showNotification(`🎉 جکپات! شما ${gameState.jackpot} سکه بردید! 🎉`);
            gameState.jackpot = 5000; // بازنشانی جکپات
        }
    }
    
    updateUI();
}

// بررسی برد یک خط
function checkLineWin(lineSymbols) {
    // جایگزینی نمادهای Wild
    const processedLine = processWilds(lineSymbols);
    const firstSymbol = processedLine[0];
    
    // شمارش نمادهای مشابه
    let count = 1;
    for (let i = 1; i < processedLine.length; i++) {
        if (processedLine[i] === firstSymbol || processedLine[i] === '💎') {
            count++;
        } else {
            break;
        }
    }
    
    // بررسی حداقل 3 نماد مشابه
    if (count >= 3) {
        const winAmount = PAYOUT_TABLE[firstSymbol]?.[count] || 0;
        return { win: winAmount, symbol: firstSymbol, count };
    }
    
    return { win: 0, symbol: null, count: 0 };
}

// پردازش نمادهای Wild
function processWilds(symbols) {
    return symbols.map(symbol => {
        if (SYMBOLS[symbol]?.isWild) {
            // پیدا کردن اولین نماد غیر Wild در خط
            const nonWild = symbols.find(s => !SYMBOLS[s]?.isWild);
            return nonWild || symbol;
        }
        return symbol;
    });
}

// شمارش نمادهای Scatter
function countScatters(reels) {
    let count = 0;
    for (let col = 0; col < reels.length; col++) {
        for (let row = 0; row < reels[col].length; row++) {
            if (reels[col][row] === '⭐') {
                count++;
            }
        }
    }
    return count;
}

// دریافت نمادهای ریل‌ها
function getReelSymbols() {
    const reels = [];
    const columns = document.querySelectorAll('.reel-column');
    
    columns.forEach(column => {
        const columnSymbols = [];
        const symbols = column.querySelectorAll('.symbol');
        
        symbols.forEach(symbol => {
            columnSymbols.push(symbol.textContent);
        });
        
        reels.push(columnSymbols);
    });
    
    return reels;
}

// نمایش برد
function showWin(amount, winningLines) {
    const winDiv = document.getElementById('current-win');
    
    let html = `
        <div style="text-align: center;">
            <h4 style="color: #2ecc71; margin-bottom: 10px;">
                <i class="fas fa-trophy"></i> برنده شدید!
            </h4>
            <div style="font-size: 1.8rem; font-weight: bold; color: #f1c40f;">
                ${amount.toLocaleString()} سکه
            </div>
    `;
    
    if (winningLines.length > 0) {
        html += '<div style="margin-top: 10px; font-size: 0.9rem;">';
        winningLines.forEach(win => {
            if (win.type === 'scatter') {
                html += `<div>${win.count} × ⭐ = ${win.win} سکه + ${win.freeSpins} چرخش رایگان</div>`;
            } else {
                html += `<div>خط ${win.line + 1}: ${win.count} × ${win.symbol} = ${win.win} سکه</div>`;
            }
        });
        html += '</div>';
    }
    
    if (gameState.multiplier > 1) {
        html += `<div style="margin-top: 5px; color: #9b59b6;">ضریب: ${gameState.multiplier}x</div>`;
    }
    
    if (gameState.freeSpins > 0) {
        html += `<div style="margin-top: 5px; color: #3498db;">چرخش‌های رایگان: ${gameState.freeSpins}</div>`;
    }
    
    winDiv.innerHTML = html;
    
    // نمایش اعلان
    showNotification(`🎊 ${amount.toLocaleString()} سکه برنده شدید!`);
}

// اضافه کردن به تاریخچه
function addToHistory(amount, lines) {
    const historyList = document.getElementById('history-list');
    const emptyMsg = historyList.querySelector('.empty-history');
    
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const time = new Date().toLocaleTimeString('fa-IR');
    const linesText = lines.map(l => l.count + '×' + l.symbol).join(', ');
    
    historyItem.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
            <span>${time}</span>
            <span style="color: #2ecc71; font-weight: bold;">${amount.toLocaleString()} سکه</span>
        </div>
        <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">${linesText}</div>
    `;
    
    historyList.insertBefore(historyItem, historyList.firstChild);
    
    // محدود کردن تاریخچه به 10 مورد
    const items = historyList.querySelectorAll('.history-item');
    if (items.length > 10) {
        items[items.length - 1].remove();
    }
}

// به‌روزرسانی پیشرفت جکپات
function updateJackpotProgress() {
    gameState.jackpotProgress += 0.5; // 0.5% افزایش پس از هر چرخش
    
    if (gameState.jackpotProgress >= 100) {
        gameState.jackpotProgress = 0;
        gameState.jackpot += 1000; // افزایش جکپات
    }
    
    const progressFill = document.getElementById('jackpot-progress');
    const percentSpan = document.getElementById('jackpot-percent');
    
    progressFill.style.width = `${gameState.jackpotProgress}%`;
    percentSpan.textContent = `${Math.round(gameState.jackpotProgress)}%`;
    
    document.getElementById('jackpot').textContent = gameState.jackpot.toLocaleString();
}

// به‌روزرسانی چرخش‌های رایگان
function updateFreeSpins() {
    document.getElementById('free-spins').textContent = gameState.freeSpins;
}

// تنظیم تم
function setTheme(themeName) {
    gameState.theme = themeName;
    
    // حذف کلاس‌های تم قبلی
    document.body.classList.remove('gold-theme', 'blue-theme', 'red-theme', 'dark-theme');
    document.body.classList.add(themeName + '-theme');
    
    // به‌روزرسانی دکمه‌های انتخاب تم
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        }
    });
    
    // ذخیره تم
    saveGame();
}

// پخش صدا
function playSound(soundName) {
    try {
        const audio = document.getElementById(`${soundName}-sound`);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("پخش صدا متوقف شد:", e));
        }
    } catch (e) {
        console.log("خطا در پخش صدا:", e);
    }
}

// نمایش اعلان
function showNotification(message) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    text.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// به‌روزرسانی UI
function updateUI() {
    document.getElementById('balance').textContent = gameState.balance.toLocaleString();
    document.getElementById('spin-count').textContent = gameState.spinCount.toLocaleString();
    document.getElementById('score').textContent = gameState.score.toLocaleString();
    document.getElementById('total-wins').textContent = gameState.totalWins.toLocaleString();
    document.getElementById('bet-amount').textContent = gameState.currentBet;
    document.getElementById('multiplier').textContent = `${gameState.multiplier}x`;
    document.getElementById('free-spins').textContent = gameState.freeSpins;
    document.getElementById('jackpot').textContent = gameState.jackpot.toLocaleString();
}

// تنظیم گوش‌دهنده‌های رویداد
function setupEventListeners() {
    // دکمه چرخش
    document.getElementById('spin-btn').addEventListener('click', spinReels);
    
    // دکمه توقف
    document.getElementById('stop-btn').addEventListener('click', () => {
        if (gameState.isSpinning) {
            // متوقف کردن چرخش‌ها
            document.querySelectorAll('.reel-column').forEach(column => {
                column.style.transition = 'transform 0.5s ease-out';
                column.style.transform = 'translateY(0)';
            });
            
            // پایان چرخش
            setTimeout(finishSpin, 500);
        }
    });
    
    // دکمه بازی جدید
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('آیا مطمئن هستید؟ تمام پیشرفت شما از بین خواهد رفت.')) {
            localStorage.removeItem('slotMachineGame');
            location.reload();
        }
    });
    
    // دکمه چرخش خودکار
    document.getElementById('auto-spin-btn').addEventListener('click', function() {
        gameState.autoSpin = !gameState.autoSpin;
        
        if (gameState.autoSpin) {
            this.innerHTML = '<i class="fas fa-stop"></i> توقف خودکار';
            this.classList.add('active');
            
            if (!gameState.isSpinning && gameState.balance >= gameState.currentBet) {
                spinReels();
            }
        } else {
            this.innerHTML = '<i class="fas fa-robot"></i> چرخش خودکار';
            this.classList.remove('active');
        }
    });
    
    // کنترل شرط
    document.getElementById('bet-up').addEventListener('click', () => {
        if (gameState.currentBet < 100) {
            gameState.currentBet += 5;
            updateUI();
            playSound('click');
        }
    });
    
    document.getElementById('bet-down').addEventListener('click', () => {
        if (gameState.currentBet > 5) {
            gameState.currentBet -= 5;
            updateUI();
            playSound('click');
        }
    });
    
    // کنترل سرعت
    document.getElementById('spin-speed').addEventListener('input', function() {
        playSound('click');
    });
    
    // انتخاب تم
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.dataset.theme;
            setTheme(theme);
            playSound('click');
        });
    });
    
    // بستن اعلان
    document.getElementById('close-notification').addEventListener('click', function() {
        document.getElementById('notification').style.display = 'none';
    });
    
    // کلیک روی دکمه‌ها (صدای کلیک)
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled) {
                playSound('click');
            }
        });
    });
}

// راه‌اندازی بازی هنگامی که صفحه بارگذاری شد
document.addEventListener('DOMContentLoaded', initGame);