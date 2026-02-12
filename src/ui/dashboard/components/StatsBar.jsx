import React from 'react';
import { Text, Stack, Box, Inline, Heading, Lozenge } from '@forge/react';
import { formatNumber } from '../utils/formatters';

export const StatsBar = ({ stats }) => {
    const items = [
        { icon: '🍃', value: stats?.leaves || 0, label: 'Leaves', appearance: 'success' },
        { icon: '🌲', value: stats?.trees || 0, label: 'Trees', appearance: 'success' },
        { icon: '✅', value: stats?.issues || 0, label: 'Issues', appearance: 'default' },
        { icon: '🌍', value: stats?.co2 || 0, label: 'kg CO₂', appearance: 'brand' }
    ];

    return (
        <Inline space="space.200" alignBlock="stretch">
            {items.map((item, i) => (
                <Box
                    key={i}
                    padding="space.250"
                    xcss={{
                        backgroundColor: 'elevation.surface.raised',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: item.appearance === 'success'
                            ? 'color.border.success'
                            : item.appearance === 'brand'
                                ? 'color.border.brand'
                                : 'color.border.neutral',
                        boxShadow: 'elevation.shadow.raised',
                        flexGrow: '1',
                        minWidth: '150px'
                    }}
                >
                    <Stack space="space.100">
                        <Inline space="space.100" alignBlock="center" spread="space-between">
                            <Inline space="space.100" alignBlock="center">
                                <Box
                                    xcss={{
                                        backgroundColor: 'color.background.neutral.subtle',
                                        borderRadius: '8px',
                                        padding: 'space.100'
                                    }}
                                >
                                    <Text size="medium">{item.icon}</Text>
                                </Box>
                                <Text size="small">{item.label}</Text>
                            </Inline>
                            <Lozenge appearance={item.appearance === 'brand' ? 'new' : item.appearance}>
                                {item.appearance === 'brand' ? 'CO₂' : 'Impact'}
                            </Lozenge>
                        </Inline>
                        <Heading as="h3">
                            {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
                        </Heading>
                        <Text size="small">
                            {item.label === 'kg CO₂' ? 'Estimated monthly offset' : 'This month'}
                        </Text>
                    </Stack>
                </Box>
            ))}
        </Inline>
    );
};

export default StatsBar;
