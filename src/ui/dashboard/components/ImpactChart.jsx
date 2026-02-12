import React from 'react';
import { Text, Stack, Box, PieChart, BarChart, Strong } from '@forge/react';

export const ImpactChart = ({
    type = 'pie',
    title,
    subtitle,
    data,
    height = 220
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
                {type === 'bar' ? (
                    <BarChart
                        data={data}
                        xAccessor="xAxis"
                        yAccessor="value"
                        colorAccessor="series"
                        title=""
                        subtitle={subtitle}
                        height={height}
                    />
                ) : (
                    <PieChart
                        data={data}
                        colorAccessor="type"
                        labelAccessor="label"
                        valueAccessor="value"
                        title=""
                        subtitle={subtitle}
                        height={height}
                        showMarkLabels={true}
                    />
                )}
            </Stack>
        </Box>
    );
};

export default ImpactChart;
