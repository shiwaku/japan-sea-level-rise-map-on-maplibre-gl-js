/*
 * Copyright 2024 全国Ｑ地図管理者
 * Released under the MIT license
 * https://github.com/qchizu/qchizu_maplibre/blob/main/LISENCE.md
 */
// @ts-nocheck
import { addProtocol } from 'maplibre-gl';
import { getCalculateHeightFunction } from './protocolUtils';

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
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);

            const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageBitmap, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];

                let h = calculateHeight(r, g, b);

                // 標高がスライダーの値以下なら青色、それ以上は透明に設定
                if (h <= maxElevation) {
                    imageData.data[i] = 0; // Red
                    imageData.data[i + 1] = 0; // Green
                    imageData.data[i + 2] = 255; // Blue
                    imageData.data[i + 3] = 255; // Alpha (完全不透明)
                } else {
                    imageData.data[i + 3] = 0; // Alpha (完全透明)
                }
            }

            ctx.putImageData(imageData, 0, 0);

            return canvas.convertToBlob().then(async (blob) => {
                return { data: await blob.arrayBuffer() };
            });
        } else {
            return { data: null };
        }
    };

    addProtocol(protocol, loadFn);
}

export { dem2ReliefProtocol };
