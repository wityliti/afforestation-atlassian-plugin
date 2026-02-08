import React from 'react';
import { Text, Stack, Box, Heading, Inline, ProgressBar, Lozenge, Strong } from '@forge/react';

/**
 * Impact visualization using ProgressBar (fallback for charts)
 */
export const ImpactChart = ({
    type = 'donut',
    title,
    data
}) => {
    if (!data || data.length === 0) {
        return (
            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'elevation.surface.raised',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'color.border.neutral'
                }}
            >
                <Stack space="space.100" alignInline="center">
                    <Text>📊</Text>
                    <Text size="small">No data yet</Text>
                </Stack>
            </Box>
        );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <Box
            padding="space.200"
            xcss={{
                backgroundColor: 'elevation.surface.raised',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'color.border.neutral'
            }}
        >
            <Stack space="space.150">
                {title && <Text><Strong>{title}</Strong></Text>}

                {data.map((item, i) => {
                    const percent = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                        <Stack key={i} space="space.050">
                            <Inline spread="space-between" alignBlock="center">
                                <Text size="small">{item.label}</Text>
                                <Lozenge appearance={i === 0 ? 'success' : 'default'}>
                                    {item.value.toLocaleString()} ({percent.toFixed(0)}%)
                                </Lozenge>
                            </Inline>
                            <ProgressBar
                                value={percent / 100}
                                appearance={i === 0 ? 'success' : 'default'}
                            />
                        </Stack>
                    );
                })}
            </Stack>
        </Box>
    );
};

export default ImpactChart;
