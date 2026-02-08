import React from 'react';
import { Text, Stack, Box, Inline, Heading, Strong } from '@forge/react';
import { formatNumber } from '../utils/formatters';

/**
 * Clean stats summary as metric cards row
 */
export const StatsBar = ({ stats }) => {
    const items = [
        { icon: '🍃', value: stats?.leaves || 0, label: 'Leaves' },
        { icon: '🌲', value: stats?.trees || 0, label: 'Trees' },
        { icon: '✅', value: stats?.issues || 0, label: 'Issues' },
        { icon: '🌍', value: stats?.co2 || 0, label: 'kg CO₂', suffix: true }
    ];

    return (
        <Inline space="space.200" alignBlock="stretch">
            {items.map((item, i) => (
                <Box
                    key={i}
                    padding="space.150"
                    xcss={{
                        backgroundColor: 'elevation.surface.raised',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'color.border.neutral',
                        flexGrow: '1',
                        textAlign: 'center'
                    }}
                >
                    <Stack space="space.050" alignInline="center">
                        <Text>{item.icon}</Text>
                        <Heading as="h3">
                            {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
                        </Heading>
                        <Text size="small">{item.label}</Text>
                    </Stack>
                </Box>
            ))}
        </Inline>
    );
};

export default StatsBar;
