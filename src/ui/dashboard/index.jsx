import React, { useState, useEffect } from 'react';
import { invoke, router } from '@forge/bridge';
import ForgeReconciler, {
    Text,
    Stack,
    Box,
    Heading,
    ProgressBar,
    Strong,
    Inline,
    Tag,
    SectionMessage,
    Lozenge,
    Button
} from '@forge/react';

// Components
import { MetricCard, LeaderboardTable, ImpactChart, VisualForest, StatsBar } from './components';
import { calculateCO2Offset } from './utils/formatters';

// ============ Main Dashboard Component ============

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
        return (
            <Box padding="space.600">
                <Stack alignInline="center" space="space.400">
                    <ProgressBar isIndeterminate />
                    <Heading as="h3">Loading your forest...</Heading>
                </Stack>
            </Box>
        );
    }

    if (error) {
        return (
            <SectionMessage appearance="error" title="Could not load dashboard">
                <Text>{error}</Text>
            </SectionMessage>
        );
    }

    const leavesPerTree = stats?.leavesPerTree || 100;
    const aggs = stats?.aggregations || {};

    // Use dummy data for preview when no real data exists
    const hasRealData = (aggs?.monthly?.leaves || 0) > 0;
    const weeklyLeaves = hasRealData ? (aggs?.weekly?.leaves || 0) : 2847;
    const weeklyTrees = hasRealData ? (aggs?.weekly?.trees || 0) : 28;
    const weeklyIssues = hasRealData ? (aggs?.weekly?.issueCount || 0) : 156;
    const monthlyLeaves = hasRealData ? (aggs?.monthly?.leaves || 0) : 12450;
    const monthlyTrees = hasRealData ? (aggs?.monthly?.trees || 0) : 124;
    const monthlyIssues = hasRealData ? (aggs?.monthly?.issueCount || 0) : 589;
    const allTimeLeaves = hasRealData ? (aggs?.allTime?.leaves || monthlyLeaves) : 48920;
    const allTimeTrees = hasRealData ? (aggs?.allTime?.trees || monthlyTrees) : 489;

    const co2Offset = calculateCO2Offset(monthlyTrees);
    const remainderLeaves = weeklyLeaves % leavesPerTree;
    const treeProgress = hasRealData ? (remainderLeaves / leavesPerTree) : 0.73;

    // Chart data
    const impactBreakdown = [
        { label: 'This Week', value: weeklyLeaves },
        { label: 'Previous Weeks', value: Math.max(0, monthlyLeaves - weeklyLeaves) }
    ];

    return (
        <Stack space="space.400">
            {/* Header */}
            <Inline spread="space-between" alignBlock="center">
                <Inline space="space.100" alignBlock="center">
                    <Text size="large">🌱</Text>
                    <Heading as="h2">Grow for Jira</Heading>
                </Inline>
                <Inline space="space.100">
                    <Button
                        appearance="primary"
                        onClick={() => router.open('https://afforestation.org/dashboard')}
                    >
                        View Org Dashboard ↗
                    </Button>
                </Inline>
            </Inline>

            {/* Stats Summary Bar */}
            <StatsBar stats={{
                leaves: monthlyLeaves,
                trees: monthlyTrees,
                issues: monthlyIssues,
                co2: parseFloat(co2Offset)
            }} />

            {/* This Month Achievement - Premium Card */}
            <Box
                padding="space.400"
                xcss={{
                    background: 'linear-gradient(135deg, #e3f5e3 0%, #f0f7f0 100%)',
                    backgroundColor: 'color.background.success.subtle',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: 'color.border.success',
                    boxShadow: 'elevation.shadow.overlay'
                }}
            >
                <Stack space="space.300">
                    {/* Hero Stats */}
                    <Stack space="space.100" alignInline="center">
                        <Text size="small">THIS MONTH'S IMPACT</Text>
                        <Inline space="space.200" alignBlock="center">
                            <Heading as="h1" size="xxlarge">{monthlyTrees}</Heading>
                            <Stack space="space.0">
                                <Text size="large"><Strong>Trees Planted</Strong></Text>
                                <Text size="small">{co2Offset} kg CO₂ offset</Text>
                            </Stack>
                        </Inline>
                        <Inline space="space.100">
                            <Tag text={`🍃 ${monthlyLeaves.toLocaleString()} leaves earned`} color="green" />
                            <Tag text={`✅ ${monthlyIssues} issues completed`} color="blue" />
                        </Inline>
                    </Stack>

                    {/* Visual Forest - Full Width */}
                    <VisualForest treeCount={monthlyTrees} showLegend={true} compact={false} />
                </Stack>
            </Box>

            {/* Next Tree Progress */}
            <Box
                padding="space.300"
                xcss={{
                    backgroundColor: 'elevation.surface.raised',
                    borderRadius: '12px',
                    border: '2px solid',
                    borderColor: treeProgress >= 0.8 ? 'color.border.success' : 'color.border.neutral',
                    boxShadow: 'elevation.shadow.raised'
                }}
            >
                <Stack space="space.200">
                    <Inline spread="space-between" alignBlock="center">
                        <Heading as="h3">🎯 Next Tree Progress</Heading>
                        <Lozenge appearance={treeProgress >= 0.8 ? 'success' : 'inprogress'}>
                            {remainderLeaves} / {leavesPerTree} Leaves
                        </Lozenge>
                    </Inline>
                    <ProgressBar value={treeProgress} appearance={treeProgress >= 0.8 ? 'success' : 'default'} />
                    <Text>
                        {treeProgress >= 0.8 ? '🔥 ' : ''}
                        You are <Strong>{(treeProgress * 100).toFixed(0)}%</Strong> of the way to planting your next tree!
                        {treeProgress >= 0.8 ? ' Almost there! 🌟' : ''}
                    </Text>
                </Stack>
            </Box>

            {/* Metrics Row */}
            <Inline space="space.300" alignBlock="stretch">
                <MetricCard
                    title="This Week"
                    icon="📅"
                    value={weeklyLeaves}
                    subtitle={`${weeklyTrees} trees • ${weeklyIssues} issues`}
                    appearance="default"
                />
                <MetricCard
                    title="This Month"
                    icon="🗓️"
                    value={monthlyLeaves}
                    previousValue={weeklyLeaves * 4} // Rough comparison
                    subtitle={`${monthlyTrees} trees • ${monthlyIssues} issues`}
                    appearance="success"
                />
                <MetricCard
                    title="All Time"
                    icon="🏆"
                    value={allTimeLeaves}
                    subtitle={`${allTimeTrees} total trees planted`}
                    appearance="brand"
                    size="large"
                />
            </Inline>

            {/* Charts Section */}
            <Inline space="space.300" alignBlock="start">
                <Box xcss={{ flexGrow: '1', minWidth: '300px' }}>
                    <ImpactChart
                        type="donut"
                        title="📊 Monthly Impact Breakdown"
                        data={impactBreakdown}
                    />
                </Box>
                <Box xcss={{ flexGrow: '1', minWidth: '300px' }}>
                    <LeaderboardTable
                        teams={stats?.topTeams}
                        title="🏆 Top Teams (Monthly)"
                    />
                </Box>
            </Inline>

            {/* Footer */}
            <Box
                padding="space.300"
                xcss={{
                    borderTop: '2px solid',
                    borderColor: 'color.border.neutral',
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '0 0 12px 12px'
                }}
            >
                <Inline spread="space-between" alignBlock="center">
                    <Stack space="space.050">
                        <Text size="small">Powered by <Strong>Grow for Jira</Strong> 🌱</Text>
                        <Text size="small">Together, we're making a difference 🌍</Text>
                    </Stack>
                    <Lozenge appearance={stats?.plantingMode?.instantEnabled ? 'success' : 'inprogress'}>
                        {stats?.plantingMode?.instantEnabled ? '⚡ Instant Planting' : '📦 Weekly Batching'}
                    </Lozenge>
                </Inline>
            </Box>
        </Stack>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <Dashboard />
    </React.StrictMode>
);
