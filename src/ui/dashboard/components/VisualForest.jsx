import React from 'react';
import { Text, Stack, Box, Inline, Strong, Lozenge } from '@forge/react';

/**
 * Simple, clean forest visualization using native Forge components
 */
export const VisualForest = ({ treeCount, showLegend = true, compact = false }) => {
    const displayCount = treeCount > 0 ? treeCount : 12;
    const isPreview = treeCount === 0;
    const maxTrees = compact ? 15 : 30;
    const treesToShow = Math.min(displayCount, maxTrees);
    const overflow = displayCount > maxTrees ? displayCount - maxTrees : 0;

    // Create tree string
    const treeString = '🌳'.repeat(treesToShow) + (overflow > 0 ? ` +${overflow}` : '');

    if (treesToShow === 0 && !isPreview) {
        return (
            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}
            >
                <Text>🌱 Complete issues to grow your forest!</Text>
            </Box>
        );
    }

    return (
        <Box
            padding="space.200"
            xcss={{
                backgroundColor: 'color.background.success.subtle',
                borderRadius: '8px',
                textAlign: 'center',
                opacity: isPreview ? '0.5' : '1'
            }}
        >
            <Stack space="space.100" alignInline="center">
                <Text size="large">{treeString}</Text>
                {isPreview && (
                    <Text size="small">🔮 Preview — complete issues to see real trees!</Text>
                )}
                {showLegend && !isPreview && treeCount > 0 && (
                    <Inline space="space.100" alignBlock="center">
                        <Text size="small">{treeCount} trees planted</Text>
                        {treeCount >= 10 && <Lozenge appearance="success">🎉</Lozenge>}
                    </Inline>
                )}
            </Stack>
        </Box>
    );
};

export default VisualForest;
