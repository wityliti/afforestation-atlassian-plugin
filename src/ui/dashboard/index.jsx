import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import { Text, Stack, Box, Heading } from '@forge/react';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await invoke('getDashboardStats');
                setStats(data);
            } catch (err) {
                console.error('Dashboard load error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <Text>Loading impact data...</Text>;
    }

    if (error) {
        return <Text>Error: {error}</Text>;
    }

    const currencyName = stats?.currencyName || 'Leaves';
    const leavesPerTree = stats?.leavesPerTree || 100;
    const aggs = stats?.aggregations || {};

    // Calculate totals
    const weeklyLeaves = aggs?.weekly?.leaves || 0;
    const weeklyTrees = aggs?.weekly?.trees || 0;
    const monthlyLeaves = aggs?.monthly?.leaves || 0;
    const monthlyTrees = aggs?.monthly?.trees || 0;

    // Progress to next tree
    const remainderLeaves = weeklyLeaves % leavesPerTree;
    const treeProgress = Math.round((remainderLeaves / leavesPerTree) * 100);

    return (
        <Stack space="space.200">
            <Heading as="h1">🌳 Impact Dashboard</Heading>
            <Text>Track your team's environmental impact through completed work.</Text>

            {/* Summary Stats */}
            <Stack space="space.100">
                <Heading as="h3">This Week</Heading>
                <Text>🍃 {weeklyLeaves.toLocaleString()} {currencyName}</Text>
                <Text>🌲 {weeklyTrees} Trees Pledged</Text>
                <Text>📋 {aggs?.weekly?.issueCount || 0} Issues Completed</Text>
            </Stack>

            <Stack space="space.100">
                <Heading as="h3">This Month</Heading>
                <Text>🍃 {monthlyLeaves.toLocaleString()} {currencyName}</Text>
                <Text>🌲 {monthlyTrees} Trees Pledged</Text>
                <Text>📋 {aggs?.monthly?.issueCount || 0} Issues Completed</Text>
            </Stack>

            {/* Tree Progress */}
            <Stack space="space.100">
                <Heading as="h3">Progress to Next Tree</Heading>
                <Text>{remainderLeaves} / {leavesPerTree} {currencyName} ({treeProgress}%)</Text>
            </Stack>

            {/* Impact Statement */}
            <Stack space="space.100">
                <Heading as="h3">Your Impact</Heading>
                <Text>
                    This month, your team has pledged {monthlyTrees} trees through {aggs?.monthly?.issueCount || 0} completed issues.
                    {monthlyTrees > 0 && ` That's approximately ${(monthlyTrees * 21.77).toFixed(1)} kg of CO₂ sequestered per year!`}
                </Text>
            </Stack>

            {/* Mode Info */}
            <Text>
                {leavesPerTree} {currencyName} = 1 Tree |
                Mode: {stats?.plantingMode?.instantEnabled ? 'Instant Planting' : 'Weekly Pledge Batching'}
            </Text>
        </Stack>
    );
};

export default Dashboard;
