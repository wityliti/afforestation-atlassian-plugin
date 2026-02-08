/**
 * Number formatting utilities for dashboard
 */

export const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
};

export const formatPercentChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
        value: Math.abs(change).toFixed(0),
        direction: change >= 0 ? 'up' : 'down',
        isPositive: change >= 0
    };
};

// CO2 calculation: ~21.77kg per year per mature tree
export const calculateCO2Offset = (trees) => {
    return (trees * 21.77).toFixed(1);
};
