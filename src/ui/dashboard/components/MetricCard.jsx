import React from 'react';
import { Text, Stack, Box, Heading, Inline, Lozenge, Badge } from '@forge/react';
import { formatNumber, formatPercentChange } from '../utils/formatters';

/**
 * Premium metric card with trend indicator
 */
export const MetricCard = ({
    title,
    icon,
    value,
    previousValue = null,
    subtitle,
    appearance = 'default',
    size = 'medium'
}) => {
    const trend = previousValue !== null ? formatPercentChange(value, previousValue) : null;

    const bgStyles = {
        default: 'elevation.surface.raised',
        success: 'color.background.success.subtle',
        brand: 'color.background.brand.subtle',
        warning: 'color.background.warning.subtle'
    };

    const borderStyles = {
        default: 'color.border.neutral',
        success: 'color.border.success',
        brand: 'color.border.brand',
        warning: 'color.border.warning'
    };

    return (
        <Box
            padding="space.300"
            xcss={{
                backgroundColor: bgStyles[appearance],
                borderRadius: '12px',
                border: '1px solid',
                borderColor: borderStyles[appearance],
                boxShadow: 'elevation.shadow.raised',
                minWidth: '180px',
                flexGrow: '1',
                transition: 'all 0.2s ease',
                ':hover': {
                    boxShadow: 'elevation.shadow.overlay',
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Stack space="space.150">
                <Inline space="space.100" alignBlock="center">
                    <Box xcss={{
                        backgroundColor: 'color.background.neutral',
                        borderRadius: '8px',
                        padding: 'space.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Text size="large">{icon}</Text>
                    </Box>
                    <Text size="small">{title}</Text>
                </Inline>

                <Inline space="space.100" alignBlock="center">
                    <Heading as={size === 'large' ? 'h1' : 'h2'} size={size === 'large' ? 'xxlarge' : 'xlarge'}>
                        {formatNumber(value)}
                    </Heading>
                    {trend && (
                        <Lozenge appearance={trend.isPositive ? 'success' : 'removed'}>
                            {trend.isPositive ? '↑' : '↓'} {trend.value}%
                        </Lozenge>
                    )}
                </Inline>

                {subtitle && <Text size="small">{subtitle}</Text>}
            </Stack>
        </Box>
    );
};

export default MetricCard;
