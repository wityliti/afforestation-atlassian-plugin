import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import { Text, Badge, Stack, Box } from '@forge/react';

const Panel = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Get issue context from the view
                const context = await invoke('getIssueImpact', { issueId: 'current' });
                setData(context);
            } catch (err) {
                console.error('Issue panel load error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <Text>Loading...</Text>;
    }

    if (error) {
        return <Text>Error: {error}</Text>;
    }

    const currencyName = data?.currencyName || 'Leaves';
    const leavesPerTree = data?.leavesPerTree || 100;
    const ledger = data?.ledger;

    const totalLeaves = ledger?.totalLeaves || 0;
    const completionCount = ledger?.completionCount || 0;
    const treesFromIssue = Math.floor(totalLeaves / leavesPerTree);

    // If no contributions yet
    if (completionCount === 0) {
        return (
            <Stack space="space.100">
                <Text weight="bold">🌱 Impact</Text>
                <Text>No impact recorded yet. Complete this issue to earn {currencyName}!</Text>
            </Stack>
        );
    }

    return (
        <Stack space="space.100">
            <Text weight="bold">🌳 Impact from this Issue</Text>

            <Box>
                <Badge appearance="primary">🍃 {totalLeaves} {currencyName}</Badge>
            </Box>

            {treesFromIssue > 0 && (
                <Box>
                    <Badge appearance="added">🌲 {treesFromIssue} Tree{treesFromIssue > 1 ? 's' : ''}</Badge>
                </Box>
            )}

            {completionCount > 1 && (
                <Text>Completed {completionCount} times</Text>
            )}

            {ledger?.lastCompletedAt && (
                <Text>Last: {new Date(ledger.lastCompletedAt).toLocaleDateString()}</Text>
            )}
        </Stack>
    );
};

export default Panel;
