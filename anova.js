let logData = [];
let chartX = null, chartY = null, chartZ = null;
let pyodide = null;
let currentAnovaResults = null;
let currentActiveTab = 'axisX';

const speedColors = ['#004b87', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];

const courseMapping = [
    ['High Inside Ball', 'High Inside Center Ball', 'High Center Ball', 'High Outside Center Ball', 'High Outside Ball'],
    ['Mid-High Inside Ball', 'High Inside', 'High Center', 'High Outside', 'Mid-High Outside Ball'],
    ['Mid Inside Ball', 'Mid Inside', 'Mid Center', 'Mid Outside', 'Mid Outside Ball'],
    ['Mid-Low Inside Ball', 'Low Inside', 'Low Center', 'Low Outside', 'Mid-Low Outside Ball'],
    ['Low Inside Ball', 'Low Inside Center Ball', 'Low Center Ball', 'Low Outside Center Ball', 'Low Outside Ball']
];

// ▼ 追加：ストライクゾーンの定義
const strikeZoneCourses = [
    'High Inside', 'High Center', 'High Outside',
    'Mid Inside', 'Mid Center', 'Mid Outside',
    'Low Inside', 'Low Center', 'Low Outside'
];

const staticInsights = {
    axisX: "【論文掲載時の全体考察】<br>X軸のズレ（巻き込みやフレーミング）は，球速が何km/hであろうと一切影響を受けません．しかし，被験者間では明確な有意差が出ています．これは「水平方向のミット操作は，外部環境に乱されることのないプレイヤ固有の極めて強固なバイアスである」という仮説を裏付けています．",
    axisY: "【論文掲載時の全体考察】<br>垂直方向の誤差は，被験者の違いよりも「球速」によって劇的に支配されています．100 km/hではほぼ0だった誤差が，158 km/hになると被験者全員がマイナス方向（下方向）へ大きくミットを落としています．さらに交互作用が有意であるため，誰がどれくらいトラッキングを崩壊させるかには個人の熟練度が関わっていることが示唆されます．",
    axisZ: "【論文掲載時の全体考察】<br>Z軸（前後のズレ）は本実験で最も面白い指標です．「前で迎え撃つか」「的で待つか」は被験者ごとに全く異なります．同時に球速の主効果も極めて強力であり，時間的余裕が奪われるにつれて，ある者はさらに前に突撃し，ある者は反応できずに後ろへ差し込まれるという「極限状態における三次元的な空間認識のバグ」が炙り出されています．"
};

document.addEventListener('DOMContentLoaded', async () => {
    pyodide = await loadPyodide();
    await pyodide.loadPackage(["pandas", "statsmodels"]);
    
    document.getElementById('loading-overlay').style.display = 'none';

    logData = await fetchLogData();
    generateUI();
    setupActionButtons();

    const tabs = document.querySelectorAll('.anova-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentActiveTab = e.target.getAttribute('data-target');
            renderAnovaTab();
        });
    });

    await executeAnalysis();
});

async function fetchLogData() {
    try {
        const response = await fetch('data.json');
        return await response.json();
    } catch (error) {
        console.error('Error:', error); return [];
    }
}

function generateUI() {
    const players = [...new Set(logData.map(d => String(d.player)))].sort();
    const speeds = [...new Set(logData.map(d => String(d.speed)))].sort();
    
    createCheckboxes('playerCheckboxes', 'player', players);
    createCheckboxes('speedCheckboxes', 'speed', speeds);

    const gridContainer = document.getElementById('courseGrid');
    courseMapping.flat().forEach(courseValue => {
        const label = document.createElement('label'); label.className = 'sz-cell';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
        checkbox.name = 'course'; checkbox.value = courseValue; checkbox.checked = true;
        checkbox.addEventListener('change', executeAnalysis);
        label.appendChild(checkbox); gridContainer.appendChild(label);
    });
}

function createCheckboxes(containerId, name, values) {
    const container = document.getElementById(containerId);
    values.forEach(val => {
        const label = document.createElement('label'); label.className = 'checkbox-label';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
        checkbox.value = val; checkbox.name = name; checkbox.checked = true;
        checkbox.addEventListener('change', executeAnalysis);
        label.appendChild(checkbox); label.appendChild(document.createTextNode(val));
        container.appendChild(label);
    });
}

function setupActionButtons() {
    document.querySelectorAll('.select-all').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const t = e.target.getAttribute('data-target');
            document.querySelectorAll(`input[name="${t}"]`).forEach(cb => cb.checked = true);
            await executeAnalysis();
        });
    });
    document.querySelectorAll('.deselect-all').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const t = e.target.getAttribute('data-target');
            document.querySelectorAll(`input[name="${t}"]`).forEach(cb => cb.checked = false);
            await executeAnalysis();
        });
    });
    
    // ▼ 追加：ストライクゾーン一括選択ボタンの挙動（Python再実行を伴う）
    document.querySelectorAll('.select-strike-zone').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll(`input[name="course"]`).forEach(cb => {
                cb.checked = strikeZoneCourses.includes(cb.value);
            });
            await executeAnalysis();
        });
    });
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
}

async function executeAnalysis() {
    const selectedPlayers = getCheckedValues('player');
    const selectedSpeeds = getCheckedValues('speed');
    const selectedCourses = getCheckedValues('course');
    const totalCourses = document.querySelectorAll('input[name="course"]').length;

    // ▼ 追加：ストライクゾーンのみか判定
    const isStrikeZoneOnly = selectedCourses.length === strikeZoneCourses.length && 
                             selectedCourses.every(c => strikeZoneCourses.includes(c));

    let cText = '';
    if (selectedCourses.length === totalCourses) {
        cText = '全25コース';
    } else if (selectedCourses.length === 0) {
        cText = 'なし';
    } else if (isStrikeZoneOnly) {
        cText = 'ストライクゾーン (9マス)';
    } else {
        cText = `${selectedCourses.length}コース`;
    }

    document.getElementById('filterStatus').textContent = `抽出: プレイヤー(${selectedPlayers.length}) ｜ 球速(${selectedSpeeds.length}) ｜ コース(${cText})`;

    renderComparisonCharts(selectedPlayers, selectedSpeeds, selectedCourses);

    if (selectedPlayers.length < 2 || selectedSpeeds.length < 2 || selectedCourses.length === 0) {
        currentAnovaResults = { error: "二元配置分散分析（主効果と交互作用）を計算するには，プレイヤーと球速をそれぞれ2つ以上選択してください．" };
        renderAnovaTab();
        return;
    }

    const filteredForPython = [];
    logData.forEach(d => {
        if (selectedPlayers.includes(String(d.player)) && 
            selectedSpeeds.includes(String(d.speed)) && 
            selectedCourses.includes(String(d.course))) {
            
            filteredForPython.push({
                player: String(d.player),
                speed: String(d.speed),
                diff_x: (d.mitt_x - d.target_x) * 100,
                diff_y: (d.mitt_y - d.target_y) * 100,
                diff_z: (d.mitt_z - d.target_z) * 100
            });
        }
    });

    window.anovaDataForPython = filteredForPython;

    const pythonCode = `
import js
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols
import json

output_json = ""
try:
    data = js.anovaDataForPython.to_py()
    df = pd.DataFrame(data)

    results = {}
    axes = {'axisX': 'diff_x', 'axisY': 'diff_y', 'axisZ': 'diff_z'}

    for js_key, col in axes.items():
        model = ols(f"{col} ~ C(player) + C(speed) + C(player):C(speed)", data=df).fit()
        aov = sm.stats.anova_lm(model, typ=2)
        
        def extract(row_name):
            return {
                'F': float(aov.loc[row_name, 'F']),
                'p': float(aov.loc[row_name, 'PR(>F)']),
                'df1': int(aov.loc[row_name, 'df']),
                'df2': int(aov.loc['Residual', 'df'])
            }

        results[js_key] = {
            'player': extract('C(player)'),
            'speed': extract('C(speed)'),
            'interaction': extract('C(player):C(speed)')
        }
    
    output_json = json.dumps(results)
except Exception as e:
    output_json = json.dumps({"error": str(e)})

output_json
`;

    try {
        const resultJson = await pyodide.runPythonAsync(pythonCode);
        currentAnovaResults = JSON.parse(resultJson);
    } catch (e) {
        currentAnovaResults = { error: "Python実行エラー: " + e.message };
    }
    
    renderAnovaTab();
}

function formatPValue(p) {
    if (p < 0.001) {
        const exponent = Math.floor(Math.log10(p));
        const mantissa = (p / Math.pow(10, exponent)).toFixed(2);
        return `p = ${mantissa} \\times 10^{${exponent}}`;
    }
    return `p = ${p.toFixed(3)}`;
}

function evaluateSignificance(p) {
    if (p < 0.001) return { class: 'sig-high', text: '極めて強い有意差' };
    if (p < 0.05) return { class: 'sig-yes', text: '有意差あり' };
    if (p < 0.1) return { class: 'sig-trend', text: '有意傾向' };
    return { class: 'sig-no', text: '有意差なし' };
}

function renderAnovaTab() {
    const container = document.getElementById('anovaContent');
    
    if (currentAnovaResults.error) {
        container.innerHTML = `<div class="result-card"><h3 style="color:#e74c3c;">解析エラー</h3><p>${currentAnovaResults.error}</p></div>`;
        return;
    }

    const data = currentAnovaResults[currentActiveTab];
    const titles = { axisX: "X軸 (水平方向)", axisY: "Y軸 (垂直方向)", axisZ: "Z軸 (奥行き方向)" };
    
    const buildStatBox = (label, stat) => {
        if (!stat || isNaN(stat.F)) return `<div class="stat-box"><h4>${label}</h4><p>データ不足</p></div>`;
        const sig = evaluateSignificance(stat.p);
        const mathStr = `\\(F(${stat.df1}, ${stat.df2}) = ${stat.F.toFixed(2)}, ${formatPValue(stat.p)}\\)`;
        return `
            <div class="stat-box">
                <h4>${label}</h4>
                <div class="math">${mathStr}</div>
                <span class="significance ${sig.class}">${sig.text}</span>
            </div>
        `;
    };

    container.innerHTML = `
        <div class="result-card">
            <h3>${titles[currentActiveTab]} の Type II 二元配置分散分析</h3>
            <div class="stat-grid">
                ${buildStatBox('被験者の主効果', data.player)}
                ${buildStatBox('球速の主効果', data.speed)}
                ${buildStatBox('交互作用 (被験者×球速)', data.interaction)}
            </div>
            <div class="insight-box">
                ${staticInsights[currentActiveTab]}
            </div>
        </div>
    `;

    if (window.MathJax) {
        MathJax.typesetPromise([container]).catch((err) => console.log(err.message));
    }
}

function getMean(array) {
    if (array.length === 0) return null;
    return array.reduce((a, b) => a + b, 0) / array.length;
}

function renderComparisonCharts(selectedPlayers, selectedSpeeds, selectedCourses) {
    const datasetsX = [], datasetsY = [], datasetsZ = [];

    selectedSpeeds.forEach((speed, i) => {
        const dataX = [], dataY = [], dataZ = [];
        const color = speedColors[i % speedColors.length];

        selectedPlayers.forEach(player => {
            const filtered = logData.filter(d => 
                String(d.player) === String(player) && 
                String(d.speed) === String(speed) && 
                selectedCourses.includes(String(d.course))
            );
            dataX.push(getMean(filtered.map(d => (d.mitt_x - d.target_x) * 100)));
            dataY.push(getMean(filtered.map(d => (d.mitt_y - d.target_y) * 100)));
            dataZ.push(getMean(filtered.map(d => (d.mitt_z - d.target_z) * 100)));
        });

        const baseDataset = { label: speed, backgroundColor: color, borderWidth: 1 };
        datasetsX.push({ ...baseDataset, data: dataX });
        datasetsY.push({ ...baseDataset, data: dataY });
        datasetsZ.push({ ...baseDataset, data: dataZ });
    });

    drawBarChart('meanChartX', selectedPlayers, datasetsX, '平均 水平誤差 [cm]', chartX, (c) => chartX = c);
    drawBarChart('meanChartY', selectedPlayers, datasetsY, '平均 垂直誤差 [cm]', chartY, (c) => chartY = c);
    drawBarChart('meanChartZ', selectedPlayers, datasetsZ, '平均 奥行誤差 [cm]', chartZ, (c) => chartZ = c);
}

function drawBarChart(canvasId, labels, datasets, yLabel, chartInstance, setChartInstance) {
    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    const newChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw !== null ? ctx.raw.toFixed(1) : 'N/A'} cm` } }
            },
            scales: {
                y: { title: { display: true, text: yLabel }, grid: { color: '#eee', drawBorder: true } },
                x: { title: { display: true, text: 'プレイヤー' }, grid: { display: false } }
            }
        }
    });
    setChartInstance(newChart);
}