let errorChart = null;
let logData = [];

document.addEventListener('DOMContentLoaded', async () => {
    logData = await fetchLogData();
    populateSelectOptions();

    const filters = ['datasetSelect', 'speedSelect', 'planeSelect'];
    filters.forEach(id => {
        document.getElementById(id).addEventListener('change', renderChart);
    });

    renderChart();
});

async function fetchLogData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('データ取得失敗');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

function populateSelectOptions() {
    const datasets = [...new Set(logData.map(d => d.dataset))].sort();
    const speeds = [...new Set(logData.map(d => d.speed))].sort();

    const addOptions = (selectId, values) => {
        const select = document.getElementById(selectId);
        values.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
        });
    };

    addOptions('datasetSelect', datasets);
    addOptions('speedSelect', speeds);
}

// Pythonコードのクリッピング関数を再現
function clip(val, limit = 0.38) {
    return Math.max(-limit, Math.min(limit, val));
}

// 捕球結果のカテゴリ分け（Pythonと同一ロジック）
function categorizeCatch(res) {
    if (res.includes('WildPitch')) return 'Missed';
    if (res.includes('PassedBall')) return 'Dropped';
    return 'Perfect';
}

function renderChart() {
    const datasetFilter = document.getElementById('datasetSelect').value;
    const speedFilter = document.getElementById('speedSelect').value;
    const plane = document.getElementById('planeSelect').value; // 'XY' or 'ZY'

    // フィルタリングと座標計算
    const processedData = logData
        .filter(d => (datasetFilter === 'all' || d.dataset === datasetFilter))
        .filter(d => (speedFilter === 'all' || d.speed === speedFilter))
        .map(d => {
            const diffX = clip(d.mitt_x - d.target_x);
            const diffY = clip(d.mitt_y - d.target_y);
            const diffZ = clip(d.mitt_z - d.target_z);
            
            return {
                x: plane === 'XY' ? diffX : diffZ,
                y: diffY,
                category: categorizeCatch(d.catch_result)
            };
        });

    // カテゴリごとのデータセット分割
    const perfectData = processedData.filter(d => d.category === 'Perfect');
    const droppedData = processedData.filter(d => d.category === 'Dropped');
    const missedData = processedData.filter(d => d.category === 'Missed');

    const ctx = document.getElementById('errorChart').getContext('2d');
    if (errorChart) errorChart.destroy();

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#004b87';

    errorChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Perfect',
                    data: perfectData,
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    pointStyle: 'circle',
                    pointRadius: 6
                },
                {
                    label: 'Dropped',
                    data: droppedData,
                    backgroundColor: 'transparent',
                    borderColor: primaryColor,
                    borderWidth: 2,
                    pointStyle: 'rect', // 四角（□）
                    pointRadius: 6
                },
                {
                    label: 'Missed',
                    data: missedData,
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderWidth: 2,
                    pointStyle: 'crossRot', // バツ印（×）
                    pointRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { 
                        display: true, 
                        text: plane === 'XY' ? 'Mitt_Catch_X - Target_Pos_X [m]' : 'Mitt_Catch_Z - Target_Pos_Z [m]'
                    },
                    min: -0.4, max: 0.4,
                    grid: { color: '#ddd', drawBorder: true }
                },
                y: {
                    title: { display: true, text: 'Mitt_Catch_Y - Target_Pos_Y [m]' },
                    min: -0.4, max: 0.4,
                    grid: { color: '#ddd', drawBorder: true }
                }
            },
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}