import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { dem2ReliefProtocol } from './protocols/dem2ReliefProtocol';

// マップの初期化
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tile.openstreetmap.jp/styles/maptiler-basic-ja/style.json',
    center: [140.048, 35.828],
    zoom: 8.26,
    maxPitch: 85,
    hash: true,
    attributionControl: false,
});

// ズーム・回転
map.addControl(new maplibregl.NavigationControl());

// フルスクリーンモードのオンオフ
map.addControl(new maplibregl.FullscreenControl());

// 現在位置表示
map.addControl(
    new maplibregl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: false,
        },
        fitBoundsOptions: { maxZoom: 18 },
        trackUserLocation: true,
        showUserLocation: true,
    })
);

// スケール表示
map.addControl(
    new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric',
    })
);

// Attributionを折りたたみ表示
map.addControl(
    new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
            '（<a href="https://twitter.com/shi__works" target="_blank">Twitter</a> | <a href="https://github.com/shi-works/japan-sea-level-rise-map-on-maplibre-gl-js" target="_blank">Github</a>） ',
    })
);

// 3D地形コントロール表示
map.addControl(
    new maplibregl.TerrainControl({
        source: 'gsi-terrain-rgb',
        exaggeration: 1, // 標高を強調する倍率
    })
);

map.on('load', () => {
    // 標高タイルDEMソースの追加
    map.addSource('gsi-terrain-rgb', {
        type: 'raster-dem',
        minzoom: 1,
        maxzoom: 18,
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
            "<a href='https://maps.gsi.go.jp/development/ichiran.html#dem' target='_blank'>地理院タイル(標高タイル)</a>",
    });

    // 標高を地形としてセット
    // map.setTerrain({ source: 'gsi-terrain-rgb', exaggeration: 1 });

    // 陰影起伏図ソース
    map.addSource('hillshade', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
        attribution:
            '<a href="https://maps.gsi.go.jp/development/ichiran.html#hillshademap" target="_blank">地理院タイル(陰影起伏図)</a>',
        tileSize: 256,
    });

    // 陰影起伏図レイヤ
    map.addLayer({
        id: 'hillshade',
        type: 'raster',
        source: 'hillshade',
        minzoom: 2,
        maxzoom: 18,
        paint: {
            'raster-opacity': 0.3,
        },
    });

    // カスタムリリーフプロトコルを使用した標高タイルラスターソースの追加
    dem2ReliefProtocol('custom-relief', 'mapbox', 0);

    map.addSource('gsi-terrain-raster', {
        type: 'raster',
        tiles: [
            'custom-relief://https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
            "<a href='https://maps.gsi.go.jp/development/ichiran.html#dem' target='_blank'>地理院タイル(標高タイル)</a>",
    });

    // 標高タイルラスターソースを用いたレイヤーの追加
    map.addLayer({
        id: 'relief',
        type: 'raster',
        source: 'gsi-terrain-raster',
        layout: {
            visibility: 'visible',
        },
        paint: {
            'raster-opacity': 0.5, // 透明度を設定
        },
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // スライダーイベントの設定
    const slider = document.getElementById('elevation-slider') as HTMLInputElement;
    const elevationDisplay = document.getElementById('elevation-value');

    slider.addEventListener('input', function () {
        const elevation = parseInt(this.value, 10);
        if (elevationDisplay) {
            elevationDisplay.textContent = `${elevation}m`;
        }
        updateMapVisualization(elevation);
    });

    // 免責事項ボタンイベントの設定
    const disclaimerButton = document.getElementById('disclaimer-button');
    if (disclaimerButton) {
        disclaimerButton.addEventListener('click', showDisclaimer);
    }
});

function showDisclaimer() {
    const disclaimerText = `本シミュレータは地形データで一定の高さ以下の場所を青く塗りつぶす処理をするだけのものであり、ハザードマップとは異なります。堤防等による防災対策や土砂の堆積等は考慮されていません。実際の洪水や津波発生時の危険性は各自治体が公表するハザードマップでご確認ください。`;
    alert(disclaimerText);
}

function updateMapVisualization(elevation: number): void {
    // dem2ReliefProtocol でカスタムリリーフ処理を実行
    dem2ReliefProtocol('custom-relief', 'mapbox', elevation);

    const source = map.getSource('gsi-terrain-raster') as maplibregl.RasterTileSource | undefined;
    if (source) {
        source.setTiles([
            `custom-relief://https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png?elevation=${elevation}`,
        ]);
    } else {
        // ソースが存在しない場合は作成
        map.addSource('gsi-terrain-raster', {
            type: 'raster',
            tiles: [
                `custom-relief://https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png?elevation=${elevation}`,
            ],
            tileSize: 256,
            attribution:
                "<a href='https://maps.gsi.go.jp/development/ichiran.html#dem' target='_blank'>地理院タイル(標高タイル)</a>",
        });

        // 新しいレイヤーを追加
        map.addLayer({
            id: 'relief',
            type: 'raster',
            source: 'gsi-terrain-raster',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'raster-opacity': 0.4, // 透明度の調整
            },
        });
    }
}
