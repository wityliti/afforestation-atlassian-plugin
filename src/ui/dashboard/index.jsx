import ForgeUI, { render, ProjectPage, Fragment, Text, Table, Head, Row, Cell, useState, useEffect, Strong, Heading, Badge, ProgressBar } from '@forge/ui';
import { getTenantConfig } from '../services/tenant-config';
import { getDashboardAggregations, getUserAgg } from '../services/aggregation';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(async () => {
        try {
            const tenantId = window.__FORGE_CONTEXT__?.cloudId || 'default';
            const [cfg, agg] = await Promise.all([
                getTenantConfig(tenantId),
                getDashboardAggregations(tenantId)
            ]);
            setConfig(cfg);
            setStats(agg);
        } catch (error) {
            console.error('Dashboard load error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <Text>Loading impact data...</Text>;
    }

    const currencyName = config?.scoring?.currencyName || 'Leaves';
    const leavesPerTree = config?.plantingMode?.conversion?.leavesPerTree || 100;

    // Calculate totals
    const weeklyLeaves = stats?.weekly?.leaves || 0;
    const weeklyTrees = stats?.weekly?.trees || 0;
    const monthlyLeaves = stats?.monthly?.leaves || 0;
    const monthlyTrees = stats?.monthly?.trees || 0;

    // Progress to next tree
    const remainderLeaves = weeklyLeaves % leavesPerTree;
    const treeProgress = (remainderLeaves / leavesPerTree) * 100;

    return (
        <Fragment>
            <Heading size="large">🌳 Impact Dashboard</Heading>
            <Text>Track your team's environmental impact through completed work.</Text>

            {/* Summary Stats */}
            <Table>
                <Head>
                    <Cell><Text>Period</Text></Cell>
                    <Cell><Text>{currencyName} Earned</Text></Cell>
                    <Cell><Text>Trees Pledged</Text></Cell>
                    <Cell><Text>Issues Completed</Text></Cell>
                </Head>
                <Row>
                    <Cell><Strong>This Week</Strong></Cell>
                    <Cell><Badge appearance="primary" text={`🍃 ${weeklyLeaves.toLocaleString()}`} /></Cell>
                    <Cell><Badge appearance="added" text={`🌲 ${weeklyTrees}`} /></Cell>
                    <Cell><Text>{stats?.weekly?.issueCount || 0}</Text></Cell>
                </Row>
                <Row>
                    <Cell><Strong>This Month</Strong></Cell>
                    <Cell><Badge appearance="primary" text={`🍃 ${monthlyLeaves.toLocaleString()}`} /></Cell>
                    <Cell><Badge appearance="added" text={`🌲 ${monthlyTrees}`} /></Cell>
                    <Cell><Text>{stats?.monthly?.issueCount || 0}</Text></Cell>
                </Row>
            </Table>

            {/* Tree Progress */}
            <Heading size="medium">Progress to Next Tree</Heading>
            <Text>{remainderLeaves} / {leavesPerTree} {currencyName}</Text>
            <ProgressBar value={treeProgress} />

            {/* Conversion Info */}
            <Text>
                {leavesPerTree} {currencyName} = 1 Tree |
                Mode: {config?.plantingMode?.instantEnabled ? 'Instant Planting' : 'Weekly Pledge Batching'}
            </Text>

            {/* Impact Statement */}
            <Heading size="medium">Your Impact</Heading>
            <Text>
                This month, your team has pledged <Strong>{monthlyTrees} trees</Strong> through {stats?.monthly?.issueCount || 0} completed issues.
                {monthlyTrees > 0 && ` That's approximately ${(monthlyTrees * 21.77).toFixed(1)} kg of CO₂ sequestered per year!`}
            </Text>
        </Fragment>
    );
};

export const run = render(
    <ProjectPage>
        <Dashboard />
    </ProjectPage>
);
