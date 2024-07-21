/*
 * Copyright 2024 全国Ｑ地図管理者
 * Released under the MIT license
 * https://github.com/qchizu/qchizu_maplibre/blob/main/LISENCE.md
 */
export function getCalculateHeightFunction(encoding: any) {
    switch (encoding) {
        case 'gsi':
        case 'gsj':
            return (r: number, g: number, b: number ,a: number) => {
                const x = r * 65536 + g * 256 + b;
                const twoToThePowerOf23 = 8388608; // 2 ** 23
                const twoToThePowerOf24 = 16777216; // 2 ** 24
                const u = 0.01; // 標高分解能
                if (x < twoToThePowerOf23 && a !== 0) {
                    return x * u;
                } else if (x === twoToThePowerOf23 || a === 0) {
                    return -99999;
                } else {
                    return (x - twoToThePowerOf24) * u;
                }
            };
        case 'mapbox':
            return (r: number, g: number, b: number) => (r * 65536 + g * 256 + b) / 10 - 10000;
        case 'terrarium':
            return (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768;
        default:
            throw new Error('Unsupported encoding type');
    }
}