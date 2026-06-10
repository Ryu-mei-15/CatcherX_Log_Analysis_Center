let chartXY = null;
let chartZY = null;
let chartCourseXY = null;
let chartCourseZY = null;
let chartCorrection = null; // ▼ 追加：補正量グラフ用
let logData = [];

const colorPalette = [
    '#004b87', '#e74c3c', '#2ecc71', '#f39c12',
    '#9b59b6', '#34495e', '#1abc9c', '#d35400'
];

const courseMapping = [
    ['High Inside Ball', 'High Inside Center Ball', 'High Center Ball', 'High Outside Center Ball', 'High Outside Ball'],
    ['Mid-High Inside Ball', 'High Inside', 'High Center', 'High Outside', 'Mid-High Outside Ball'],
    ['Mid Inside Ball', 'Mid Inside', 'Mid Center', 'Mid Outside', 'Mid Outside Ball'],
    ['Mid-Low Inside Ball', 'Low Inside', 'Low Center', 'Low Outside', 'Mid-Low Outside Ball'],
    ['Low Inside Ball', 'Low Inside Center Ball', 'Low Center Ball', 'Low Outside Center Ball', 'Low Outside Ball']
];

const strikeZoneCourses = [
    'High Inside', 'High Center', 'High Outside',
    'Mid Inside', 'Mid Center', 'Mid Outside',
    'Low Inside', 'Low Center', 'Low Outside'
];

const courseLabelMap = {
    'High Inside Ball': '高め内角ボール',
    'High Inside Center Ball': '高め内角寄りボール',
    'High Center Ball': '高め中央ボール',
    'High Outside Center Ball': '高め外角寄りボール',
    'High Outside Ball': '高め外角ボール',

    'Mid-High Inside Ball': '中高め内角ボール',
    'High Inside': '高め内角',
    'High Center': '高め中央',
    'High Outside': '高め外角',
    'Mid-High Outside Ball': '中高め外角ボール',

    'Mid Inside Ball': '中央内角ボール',
    'Mid Inside': '中央内角',
    'Mid Center': '中央',
    'Mid Outside': '中央外角',
    'Mid Outside Ball': '中央外角ボール',

    'Mid-Low Inside Ball': '中低め内角ボール',
    'Low Inside': '低め内角',
    'Low Center': '低め中央',
    'Low Outside': '低め外角',
    'Mid-Low Outside Ball': '中低め外角ボール',

    'Low Inside Ball': '低め内角ボール',
    'Low Inside Center Ball': '低め内角寄りボール',
    'Low Center Ball': '低め中央ボール',
    'Low Outside Center Ball': '低め外角寄りボール',
    'Low Outside Ball': '低め外角ボール'
};

const courseArrowPlugin = {
    id: 'courseArrowPlugin',
    afterDatasetsDraw(chart) {
        if (!chart.canvas.id.includes('Course')) return;

        const ctx = chart.ctx;

        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;

            meta.data.forEach((element, index) => {
                const raw = dataset.data[index];
                if (!raw) return;

                const x = element.x;
                const y = element.y;
                const course = raw._course;
                const isStrike = raw._rawResult.includes('Strike');
                const color = dataset.borderColor;

                let yDir = 0;
                let xDir = 0;

                if (course.includes('High')) yDir = -1;
                if (course.includes('Low')) yDir = 1;
                if (course.includes('Inside')) xDir = -1;
                if (course.includes('Outside')) xDir = 1;

                ctx.save();
                ctx.translate(x, y);

                if (yDir === 0 && xDir === 0) {
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, 2 * Math.PI);

                    if (isStrike) {
                        ctx.fillStyle = color;
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                } else {
                    const angle = Math.atan2(yDir, xDir);
                    ctx.rotate(angle);

                    const size = 6;
                    ctx.beginPath();

                    if (isStrike) {
                        ctx.moveTo(-size, -size * 0.6);
                        ctx.lineTo(0, -size * 0.6);
                        ctx.lineTo(0, -size * 1.3);
                        ctx.lineTo(size * 1.3, 0);
                        ctx.lineTo(0, size * 1.3);
                        ctx.lineTo(0, size * 0.6);
                        ctx.lineTo(-size, size * 0.6);
                        ctx.closePath();
                        ctx.fillStyle = color;
                        ctx.fill();
                    } else {
                        ctx.moveTo(-size, 0);
                        ctx.lineTo(size, 0);
                        ctx.moveTo(size / 2, -size / 2);
                        ctx.lineTo(size, 0);
                        ctx.lineTo(size / 2, size / 2);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }

                ctx.restore();
            });
        });
    }
};

Chart.register(courseArrowPlugin);

document.addEventListener('DOMContentLoaded', async () => {
    logData = await fetchLogData();
    generateUI();
    setupActionButtons();
    renderChart();
});

async function fetchLogData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('データ取得に失敗しました．');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

function generateUI() {
    const players = [...new Set(logData.map(d => String(d.player)))].sort();
    const speeds = [...new Set(logData.map(d => String(d.speed)))].sort((a, b) => Number(a) - Number(b));

    createCheckboxes('playerCheckboxes', 'player', players);
    createCheckboxes('speedCheckboxes', 'speed', speeds, formatSpeedLabel);

    const gridContainer = document.getElementById('courseGrid');

    courseMapping.flat().forEach(courseValue => {
        const label = document.createElement('label');
        label.className = 'sz-cell';
        label.title = courseLabelMap[courseValue] || courseValue;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'course';
        checkbox.value = courseValue;
        checkbox.checked = true;
        checkbox.addEventListener('change', renderChart);

        label.appendChild(checkbox);
        gridContainer.appendChild(label);
    });
}

function createCheckboxes(containerId, name, values, formatter = v => v) {
    const container = document.getElementById(containerId);

    values.forEach(val => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = val;
        checkbox.name = name;
        checkbox.checked = true;
        checkbox.addEventListener('change', renderChart);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(formatter(val)));
        container.appendChild(label);
    });
}

function setupActionButtons() {
    document.querySelectorAll('.select-all').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetName = e.target.getAttribute('data-target');

            document.querySelectorAll(`input[name="${targetName}"]`).forEach(cb => {
                cb.checked = true;
            });

            renderChart();
        });
    });

    document.querySelectorAll('.deselect-all').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetName = e.target.getAttribute('data-target');

            document.querySelectorAll(`input[name="${targetName}"]`).forEach(cb => {
                cb.checked = false;
            });

            renderChart();
        });
    });

    document.querySelectorAll('.select-strike-zone').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            document.querySelectorAll(`input[name="course"]`).forEach(cb => {
                cb.checked = strikeZoneCourses.includes(cb.value);
            });

            renderChart();
        });
    });
}

function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function clip(val, limit = 38) {
    return Math.max(-limit, Math.min(limit, val));
}

function categorizeCatch(res) {
    if (res.includes('WildPitch')) return 'WildPitch';
    if (res.includes('PassedBall')) return 'PassedBall';
    if (res.includes('Missed')) return 'Ignored';
    return 'Perfect';
}

function formatSpeedLabel(speed) {
    const text = String(speed);
    return text.includes('km') ? text : `${text} km/h`;
}

function formatCourseLabel(course) {
    return courseLabelMap[course] || course;
}

function formatCatchResult(result) {
    if (result.includes('WildPitch')) return '暴投';
    if (result.includes('PassedBall')) return 'パスボール';
    if (result.includes('Missed')) return '見送り';
    if (result.includes('Perfect')) return '正常捕球';
    return result;
}

function formatJudgment(result) {
    if (result.includes('Strike')) return 'ストライク判定';
    if (result.includes('Ball')) return 'ボール判定';
    return '判定情報なし';
}

function formatSelectedItems(values, totalCount, allLabel, emptyLabel, formatter = v => v) {
    if (values.length === totalCount) return allLabel;
    if (values.length === 0) return emptyLabel;
    return values.map(formatter).join(', ');
}

function getCourseSelectionText(selectedCourses, totalCourses) {
    const isStrikeZoneOnly =
        selectedCourses.length === strikeZoneCourses.length &&
        selectedCourses.every(c => strikeZoneCourses.includes(c));

    if (selectedCourses.length === totalCourses) return '全25コース';
    if (selectedCourses.length === 0) return 'なし';
    if (isStrikeZoneOnly) return 'ストライクゾーン（9マス）';

    return `${selectedCourses.length}コース`;
}

function getMean(array) {
    if (array.length === 0) return null;
    return array.reduce((a, b) => a + b, 0) / array.length;
}

function renderChart() {
    const selectedPlayers = getCheckedValues('player');
    const selectedSpeeds = getCheckedValues('speed');
    const selectedCourses = getCheckedValues('course');

    const totalPlayers = document.querySelectorAll('input[name="player"]').length;
    const totalSpeeds = document.querySelectorAll('input[name="speed"]').length;
    const totalCourses = document.querySelectorAll('input[name="course"]').length;

    const playerText = formatSelectedItems(selectedPlayers, totalPlayers, '全プレイヤー', 'なし');
    const speedText = formatSelectedItems(selectedSpeeds, totalSpeeds, '全球速', 'なし', formatSpeedLabel);
    const courseText = getCourseSelectionText(selectedCourses, totalCourses);

    const statusText = `表示条件：プレイヤー ${playerText} ｜ 球速 ${speedText} ｜ コース ${courseText}`;

    const status1 = document.getElementById('filterStatus1');
    const status2 = document.getElementById('filterStatus2');
    const status3 = document.getElementById('filterStatus3'); // ▼ 追加

    if (status1) status1.textContent = statusText;
    if (status2) status2.textContent = statusText;
    if (status3) status3.textContent = statusText; // ▼ 追加

    const datasetsXY = [];
    const datasetsZY = [];
    const datasetsCourseXY = [];
    const datasetsCourseZY = [];

    selectedPlayers.forEach((playerName, index) => {
        const playerColor = colorPalette[index % colorPalette.length];

        const playerData = logData.filter(d =>
            String(d.player) === String(playerName) &&
            selectedSpeeds.includes(String(d.speed)) &&
            selectedCourses.includes(String(d.course))
        );

        if (playerData.length === 0) return;

        const pointsForCatchResult = [];
        const pointsForCourse = [];

        playerData.forEach(d => {
            const diffX = clip((d.mitt_x - d.target_x) * 100);
            const diffY = clip((d.mitt_y - d.target_y) * 100);
            const diffZ = clip((d.mitt_z - d.target_z) * 100);

            const category = categorizeCatch(d.catch_result);

            let styleResult = 'circle';
            let radiusResult = 6;

            if (category === 'PassedBall') {
                styleResult = 'rect';
            }

            if (category === 'WildPitch') {
                styleResult = 'crossRot';
                radiusResult = 8;
            }

            if (category === 'Ignored') {
                styleResult = 'triangle';
                radiusResult = 7;
            }

            const baseInfo = {
                y: diffY,
                _category: category,
                _rawResult: d.catch_result,
                _course: d.course,
                _speed: d.speed,
                _player: d.player
            };

            pointsForCatchResult.push({
                x: diffX,
                diffZ: diffZ,
                _pointStyle: styleResult,
                _radius: radiusResult,
                ...baseInfo
            });

            pointsForCourse.push({
                x: diffX,
                diffZ: diffZ,
                ...baseInfo
            });
        });

        const catchResultConfig = {
            label: playerName,
            backgroundColor: playerColor,
            borderColor: playerColor,
            borderWidth: 2,
            pointStyle: (ctx) => ctx.raw ? ctx.raw._pointStyle : 'circle',
            pointRadius: (ctx) => ctx.raw ? ctx.raw._radius : 6
        };

        const courseConfig = {
            label: playerName,
            backgroundColor: playerColor,
            borderColor: playerColor,
            pointRadius: 0,
            hitRadius: 6
        };

        datasetsXY.push({
            ...catchResultConfig,
            data: pointsForCatchResult.map(p => ({ ...p, x: p.x, y: p.y }))
        });

        datasetsZY.push({
            ...catchResultConfig,
            data: pointsForCatchResult.map(p => ({ ...p, x: p.diffZ, y: p.y }))
        });

        datasetsCourseXY.push({
            ...courseConfig,
            data: pointsForCourse.map(p => ({ ...p, x: p.x, y: p.y }))
        });

        datasetsCourseZY.push({
            ...courseConfig,
            data: pointsForCourse.map(p => ({ ...p, x: p.diffZ, y: p.y }))
        });
    });

    drawChart(
        'errorChartXY',
        datasetsXY,
        'X軸方向の捕球誤差 [cm]（左 − / 右 +）',
        chartXY,
        (c) => chartXY = c
    );

    drawChart(
        'errorChartZY',
        datasetsZY,
        'Z軸方向の捕球誤差 [cm]（後方 − / 前方 +）',
        chartZY,
        (c) => chartZY = c
    );

    drawChart(
        'errorChartCourseXY',
        datasetsCourseXY,
        'X軸方向の捕球誤差 [cm]（左 − / 右 +）',
        chartCourseXY,
        (c) => chartCourseXY = c
    );

    drawChart(
        'errorChartCourseZY',
        datasetsCourseZY,
        'Z軸方向の捕球誤差 [cm]（後方 − / 前方 +）',
        chartCourseZY,
        (c) => chartCourseZY = c
    );

    // ▼ 追加：分析3（平均補正量）の描画処理を呼び出し
    renderCorrectionChart(selectedPlayers, selectedSpeeds, selectedCourses);
}

function drawChart(canvasId, datasets, xLabel, chartInstance, setChartInstance) {
    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById(canvasId).getContext('2d');

    const newChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xLabel
                    },
                    min: -40,
                    max: 40,
                    grid: {
                        color: '#eee',
                        drawBorder: true
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Y軸方向の捕球誤差 [cm]（下 − / 上 +）'
                    },
                    min: -40,
                    max: 40,
                    grid: {
                        color: '#eee',
                        drawBorder: true
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const raw = context[0].raw;
                            return `${raw._player} / ${formatSpeedLabel(raw._speed)}`;
                        },
                        label: function(context) {
                            const raw = context.raw;
                            const x = context.parsed.x.toFixed(1);
                            const y = context.parsed.y.toFixed(1);

                            return [
                                `投球コース：${formatCourseLabel(raw._course)}`,
                                `捕球結果：${formatCatchResult(raw._rawResult)}（${formatJudgment(raw._rawResult)}）`,
                                `表示座標：(${x}, ${y}) cm`
                            ];
                        }
                    }
                }
            }
        }
    });

    setChartInstance(newChart);
}

// ▼ 追加：平均ミット補正量の棒グラフ描画ロジック
function renderCorrectionChart(selectedPlayers, selectedSpeeds, selectedCourses) {
    // 選択されたコースのうち、ストライクゾーン9コースのみを対象として抽出
    const targetCourses = selectedCourses.filter(c => strikeZoneCourses.includes(c));

    const datasets = [];

    selectedSpeeds.forEach((speed, i) => {
        const data = [];
        const color = colorPalette[i % colorPalette.length];

        selectedPlayers.forEach(player => {
            const filtered = logData.filter(d =>
                String(d.player) === String(player) &&
                String(d.speed) === String(speed) &&
                targetCourses.includes(String(d.course))
            );

            // Python側で計算した correction_2d_cm を使用（もし未計算の古いデータがあればJSでフォールバック計算）
            const meanVal = getMean(filtered.map(d => {
                if (d.correction_2d_cm !== undefined) {
                    return d.correction_2d_cm;
                } else {
                    const diffX = (d.mitt_x - d.target_x) * 100;
                    const diffY = (d.mitt_y - d.target_y) * 100;
                    return Math.sqrt(diffX * diffX + diffY * diffY);
                }
            }));

            data.push(meanVal);
        });

        datasets.push({
            label: formatSpeedLabel(speed),
            backgroundColor: color,
            borderWidth: 1,
            data: data
        });
    });

    if (chartCorrection) chartCorrection.destroy();

    const ctx = document.getElementById('correctionChart').getContext('2d');
    chartCorrection = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: selectedPlayers,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.raw !== null ? ctx.raw.toFixed(1) : 'N/A';
                            return `${ctx.dataset.label}: ${value} cm`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '平均ミット補正量 [cm]'
                    },
                    grid: {
                        color: '#eee',
                        drawBorder: true
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'プレイヤー'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}