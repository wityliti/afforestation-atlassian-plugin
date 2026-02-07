import ForgeUI, { render, IssuePanel, Fragment, Text, Badge, useState, useEffect, Strong, useProductContext } from '@forge/ui';
import { getIssueLedger } from '../services/ledger';
import { getTenantConfig } from '../services/tenant-config';

const Panel = () => {
    const context = useProductContext();
    const [ledger, setLedger] = useState(null);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(async () => {
        try {
            const tenantId = context?.platformContext?.cloudId || 'default';
            const issueId = context?.extension?.issue?.id;

            if (!issueId) {
                setLoading(false);
                return;
            }

            const [cfg, issueLedger] = await Promise.all([
                getTenantConfig(tenantId),
                getIssueLedger(tenantId, issueId)
            ]);

            setConfig(cfg);
            setLedger(issueLedger);
        } catch (error) {
            console.error('Issue panel load error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <Text>Loading...</Text>;
    }

    const currencyName = config?.scoring?.currencyName || 'Leaves';
    const leavesPerTree = config?.plantingMode?.conversion?.leavesPerTree || 100;

    const totalLeaves = ledger?.totalLeaves || 0;
    const completionCount = ledger?.completionCount || 0;
    const treesFromIssue = Math.floor(totalLeaves / leavesPerTree);

    // If no contributions yet
    if (completionCount === 0) {
        return (
            <Fragment>
                <Text>🌱 <Strong>Impact</Strong></Text>
                <Text>No impact recorded yet. Complete this issue to earn {currencyName}!</Text>
            </Fragment>
        );
    }

    return (
        <Fragment>
            <Text>🌳 <Strong>Impact from this Issue</Strong></Text>

            <Badge appearance="primary" text={`🍃 ${totalLeaves} ${currencyName}`} />

            {treesFromIssue > 0 && (
                <Badge appearance="added" text={`🌲 ${treesFromIssue} Tree${treesFromIssue > 1 ? 's' : ''}`} />
            )}

            {completionCount > 1 && (
                <Text>Completed {completionCount} time{completionCount > 1 ? 's' : ''}</Text>
            )}

            {ledger?.lastCompletedAt && (
                <Text>Last: {new Date(ledger.lastCompletedAt).toLocaleDateString()}</Text>
            )}
        </Fragment>
    );
};

export const run = render(
    <IssuePanel>
        <Panel />
    </IssuePanel>
);
