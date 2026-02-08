import React from 'react';
import { Text, Stack, Box, Heading, Inline, Tag, Badge, Lozenge, DynamicTable, Strong } from '@forge/react';

/**
 * Enterprise leaderboard with DynamicTable
 */
export const LeaderboardTable = ({ teams = [], title = "🏆 Top Contributors" }) => {
    if (!teams || teams.length === 0) {
        return (
            <Box
                padding="space.300"
                xcss={{
                    backgroundColor: 'elevation.surface.raised',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'color.border.neutral'
                }}
            >
                <Stack space="space.200">
                    <Heading as="h3">{title}</Heading>
                    <Box xcss={{
                        backgroundColor: 'color.background.neutral.subtle',
                        padding: 'space.300',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <Stack space="space.100" alignInline="center">
                            <Text size="large">🏅</Text>
                            <Text>No team data yet. Complete issues to make the leaderboard!</Text>
                        </Stack>
                    </Box>
                </Stack>
            </Box>
        );
    }

    const getMedal = (rank) => {
        if (rank === 0) return '🥇';
        if (rank === 1) return '🥈';
        if (rank === 2) return '🥉';
        return `#${rank + 1}`;
    };

    const head = {
        cells: [
            { key: 'rank', content: 'Rank', width: 10 },
            { key: 'team', content: 'Team' },
            { key: 'leaves', content: 'Leaves', width: 20 },
            { key: 'trees', content: 'Trees', width: 15 }
        ]
    };

    const rows = teams.slice(0, 5).map((team, index) => ({
        key: team.teamId,
        cells: [
            {
                key: 'rank',
                content: (
                    <Inline alignBlock="center" space="space.050">
                        <Text>{getMedal(index)}</Text>
                    </Inline>
                )
            },
            {
                key: 'team',
                content: (
                    <Text><Strong>{team.teamId}</Strong></Text>
                )
            },
            {
                key: 'leaves',
                content: (
                    <Lozenge appearance={index === 0 ? 'success' : 'default'}>
                        {team.leaves?.toLocaleString() || 0}
                    </Lozenge>
                )
            },
            {
                key: 'trees',
                content: (
                    <Badge appearance={index === 0 ? 'primary' : 'default'}>
                        {team.trees || Math.floor((team.leaves || 0) / 100)}
                    </Badge>
                )
            }
        ]
    }));

    return (
        <Box
            padding="space.300"
            xcss={{
                backgroundColor: 'elevation.surface.raised',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: 'color.border.brand',
                boxShadow: 'elevation.shadow.raised'
            }}
        >
            <Stack space="space.200">
                <Heading as="h3">{title}</Heading>
                <DynamicTable
                    head={head}
                    rows={rows}
                    rowsPerPage={5}
                    isFixedSize
                />
            </Stack>
        </Box>
    );
};

export default LeaderboardTable;
