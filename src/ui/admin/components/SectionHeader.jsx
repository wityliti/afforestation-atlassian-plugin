import React from 'react';
import { Text, Stack, Box, Heading, Button, Inline, Strong } from '@forge/react';
import { router } from '@forge/bridge';
import { SECTION_INFO } from '../constants/sectionInfo';

/**
 * Section header with title, description, tips, and optional learn more link
 */
export const SectionHeader = ({ section, showLearnMore = false }) => {
    const info = SECTION_INFO[section];
    if (!info) return null;

    return (
        <Box
            padding="space.200"
            xcss={{
                backgroundColor: 'color.background.neutral.subtle',
                borderRadius: '8px',
                marginBottom: '16px',
                borderLeft: '4px solid',
                borderLeftColor: 'color.border.brand'
            }}
        >
            <Stack space="space.100">
                <Inline spread="space-between" alignBlock="center">
                    <Inline space="space.100" alignBlock="center">
                        <Text size="large">{info.icon}</Text>
                        <Heading as="h3">{info.title}</Heading>
                    </Inline>
                    {showLearnMore && info.learnMoreUrl && (
                        <Button
                            appearance="link"
                            spacing="compact"
                            onClick={() => router.open(info.learnMoreUrl)}
                        >
                            Learn More ↗
                        </Button>
                    )}
                </Inline>
                <Text>{info.description}</Text>
                {info.formula && (
                    <Box
                        padding="space.100"
                        xcss={{
                            backgroundColor: 'color.background.discovery.subtle',
                            borderRadius: '4px',
                            marginTop: '8px'
                        }}
                    >
                        <Text size="small"><Strong>Formula:</Strong> {info.formula}</Text>
                    </Box>
                )}
                {info.tips && info.tips.length > 0 && (
                    <Box
                        padding="space.100"
                        xcss={{
                            backgroundColor: 'color.background.information.subtle',
                            borderRadius: '4px',
                            marginTop: '8px'
                        }}
                    >
                        <Stack space="space.050">
                            {info.tips.map((tip, i) => (
                                <Text size="small" key={i}>💡 {tip}</Text>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Box>
    );
};

export default SectionHeader;
