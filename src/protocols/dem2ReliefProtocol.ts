/*
 * Copyright 2024 全国Ｑ地図管理者
 * Released under the MIT license
 * https://github.com/qchizu/qchizu_maplibre/blob/main/LISENCE.md
 */
// @ts-nocheck
import { addProtocol } from 'maplibre-gl';
import { getCalculateHeightFunction } from './protocolUtils';
import { decode, encode } from 'fast-png';

function dem2ReliefProtocol(
    protocol,
    encoding, //  'gsi', 'mapbox', 'terrarium'
    maxElevation: number // スライダーの標高値
) {
    // エンコーディングに応じて適切な標高計算関数を取得
    const calculateHeight = getCalculateHeightFunction(encoding);

    const loadFn = async (params: any, abortController: AbortController) => {
        const imageUrl = params.url.replace(`${protocol}://`, '');
        const response = await fetch(imageUrl, { signal: abortController.signal });

        if (response.status === 200) {
            const buffer = await response.arrayBuffer(); // ArrayBufferとして取得
            const decodedImage = decode(new Uint8Array(buffer)); // fast-pngで画像をデコード
            const { width, height, data } = decodedImage; // 画像情報を取得

            // デコードしたピクセルデータを直接操作
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                let h = calculateHeight(r, g, b);

                // 標高がスライダーの値以下なら青色、それ以上は透明に設定
                if (h <= maxElevation) {
                    data[i] = 0; // Red
                    data[i + 1] = 0; // Green
                    data[i + 2] = 255; // Blue
                    data[i + 3] = 255; // Alpha (完全不透明)
                } else {
                    data[i + 3] = 0; // Alpha (完全透明)
                }
            }

            // fast-pngのencode関数でPNGデータにエンコード
            const pngData = encode({
                width: width,
                height: height,
                data: data,
            });

            return { data: pngData.buffer }; // エンコードしたデータを返す
        } else {
            return { data: null };
        }
    };

    addProtocol(protocol, loadFn);
}

export { dem2ReliefProtocol };
