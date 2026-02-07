import ForgeUI, { render, AdminPage, Fragment, Text, Form, TextField, Checkbox, Button, Select, Option, Table, Head, Row, Cell, useState, useEffect, Strong, Heading, SectionMessage } from '@forge/ui';
import { getTenantConfig, setTenantConfig, getFunding, setFunding } from '../services/tenant-config';
import { getCatalogProjects } from '../services/afforestation-client';
import { getDashboardAggregations } from '../services/aggregation';

const App = () => {
    const [config, setConfig] = useState(null);
    const [funding, setFundingState] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('completion');

    useEffect(async () => {
        try {
            const tenantId = window.__FORGE_CONTEXT__?.cloudId || 'default';
            const [cfg, fund, catalog] = await Promise.all([
                getTenantConfig(tenantId),
                getFunding(tenantId),
                getCatalogProjects().catch(() => [])
            ]);
            setConfig(cfg);
            setFundingState(fund);
            setProjects(catalog);
        } catch (error) {
            setMessage({ type: 'error', text: `Failed to load configuration: ${error.message}` });
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSave = async (formData) => {
        try {
            const tenantId = window.__FORGE_CONTEXT__?.cloudId || 'default';
            await setTenantConfig(tenantId, formData);
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
        }
    };

    if (loading) {
        return <Text>Loading configuration...</Text>;
    }

    return (
        <Fragment>
            <Heading size="large">🌳 Afforestation Impact Settings</Heading>

            {message && (
                <SectionMessage appearance={message.type === 'error' ? 'error' : 'confirmation'}>
                    <Text>{message.text}</Text>
                </SectionMessage>
            )}

            {/* Tab Navigation */}
            <Fragment>
                <Button text="Completion" onClick={() => setActiveTab('completion')} appearance={activeTab === 'completion' ? 'primary' : 'default'} />
                <Button text="Scope" onClick={() => setActiveTab('scope')} appearance={activeTab === 'scope' ? 'primary' : 'default'} />
                <Button text="Scoring" onClick={() => setActiveTab('scoring')} appearance={activeTab === 'scoring' ? 'primary' : 'default'} />
                <Button text="Planting" onClick={() => setActiveTab('planting')} appearance={activeTab === 'planting' ? 'primary' : 'default'} />
                <Button text="Funding" onClick={() => setActiveTab('funding')} appearance={activeTab === 'funding' ? 'primary' : 'default'} />
            </Fragment>

            {/* Completion Tab */}
            {activeTab === 'completion' && (
                <Form onSubmit={handleSave} submitButtonText="Save Completion Settings">
                    <Heading size="medium">Completion Detection</Heading>
                    <Text>Define what counts as a "completed" issue for earning impact points.</Text>

                    <Select label="Mode" name="completion.mode" defaultValue={config?.completion?.mode || 'ANY'}>
                        <Option label="ANY - Match any enabled strategy" value="ANY" />
                        <Option label="ALL - All enabled strategies must match" value="ALL" />
                    </Select>

                    <Checkbox
                        label="Match by Status Name"
                        name="completion.statusName.enabled"
                        defaultChecked={config?.completion?.statusName?.enabled}
                    />
                    <TextField
                        label="Done Status Names (comma-separated)"
                        name="completion.statusName.doneStatusNames"
                        defaultValue={config?.completion?.statusName?.doneStatusNames?.join(', ') || 'Done, Resolved, Closed'}
                        description="Status names that indicate completion"
                    />

                    <Checkbox
                        label="Match by Status Category"
                        name="completion.statusCategory.enabled"
                        defaultChecked={config?.completion?.statusCategory?.enabled}
                    />

                    <Checkbox
                        label="Require Resolution Field"
                        name="completion.resolution.enabled"
                        defaultChecked={config?.completion?.resolution?.enabled}
                    />

                    <Heading size="small">Reopen Policy</Heading>
                    <Checkbox
                        label="Enable reopen detection"
                        name="completion.reopenPolicy.enabled"
                        defaultChecked={config?.completion?.reopenPolicy?.enabled}
                    />
                    <TextField
                        label="Reaward multiplier (0-1)"
                        name="completion.reopenPolicy.reawardMultiplier"
                        defaultValue={String(config?.completion?.reopenPolicy?.reawardMultiplier || 0.5)}
                        description="Points multiplier when an issue is re-completed"
                    />
                </Form>
            )}

            {/* Scope Tab */}
            {activeTab === 'scope' && (
                <Form onSubmit={handleSave} submitButtonText="Save Scope Settings">
                    <Heading size="medium">Scope Configuration</Heading>
                    <Text>Define which issues are eligible for earning impact points.</Text>

                    <TextField
                        label="Included Projects (comma-separated, empty = all)"
                        name="scope.includedProjects"
                        defaultValue={config?.scope?.includedProjects?.join(', ') || ''}
                        description="Leave empty to include all projects"
                    />

                    <TextField
                        label="Excluded Projects (comma-separated)"
                        name="scope.excludedProjects"
                        defaultValue={config?.scope?.excludedProjects?.join(', ') || ''}
                    />

                    <TextField
                        label="Included Issue Types (comma-separated)"
                        name="scope.includedIssueTypes"
                        defaultValue={config?.scope?.includedIssueTypes?.join(', ') || 'Story, Bug, Task, Epic'}
                    />

                    <TextField
                        label="Excluded Issue Types (comma-separated)"
                        name="scope.excludedIssueTypes"
                        defaultValue={config?.scope?.excludedIssueTypes?.join(', ') || 'Sub-task'}
                    />

                    <TextField
                        label="Label Exclusions (comma-separated)"
                        name="scope.labelExclusions"
                        defaultValue={config?.scope?.labelExclusions?.join(', ') || 'no-impact'}
                        description="Issues with these labels won't earn points"
                    />
                </Form>
            )}

            {/* Scoring Tab */}
            {activeTab === 'scoring' && (
                <Form onSubmit={handleSave} submitButtonText="Save Scoring Settings">
                    <Heading size="medium">Scoring Configuration</Heading>
                    <Text>Configure how impact points (leaves) are calculated.</Text>

                    <TextField
                        label="Currency Name"
                        name="scoring.currencyName"
                        defaultValue={config?.scoring?.currencyName || 'Leaves'}
                    />

                    <TextField
                        label="Base Points per Issue"
                        name="scoring.basePoints"
                        defaultValue={String(config?.scoring?.basePoints || 10)}
                    />

                    <TextField
                        label="Story Point Multiplier"
                        name="scoring.storyPointMultiplier"
                        defaultValue={String(config?.scoring?.storyPointMultiplier || 5)}
                        description="Additional points per story point"
                    />

                    <Heading size="small">Issue Type Weights</Heading>
                    <TextField label="Bug" name="scoring.issueTypeWeights.Bug" defaultValue={String(config?.scoring?.issueTypeWeights?.Bug || 1.2)} />
                    <TextField label="Story" name="scoring.issueTypeWeights.Story" defaultValue={String(config?.scoring?.issueTypeWeights?.Story || 1.0)} />
                    <TextField label="Task" name="scoring.issueTypeWeights.Task" defaultValue={String(config?.scoring?.issueTypeWeights?.Task || 0.7)} />
                    <TextField label="Epic" name="scoring.issueTypeWeights.Epic" defaultValue={String(config?.scoring?.issueTypeWeights?.Epic || 2.0)} />

                    <Heading size="small">Caps</Heading>
                    <TextField
                        label="Max Points per Issue"
                        name="scoring.caps.perIssueMax"
                        defaultValue={String(config?.scoring?.caps?.perIssueMax || 200)}
                    />
                    <TextField
                        label="Max Points per User per Day"
                        name="scoring.caps.perUserPerDay"
                        defaultValue={String(config?.scoring?.caps?.perUserPerDay || 200)}
                    />
                </Form>
            )}

            {/* Planting Tab */}
            {activeTab === 'planting' && (
                <Form onSubmit={handleSave} submitButtonText="Save Planting Settings">
                    <Heading size="medium">Planting Mode</Heading>
                    <Text>Configure how leaves convert to trees and when planting happens.</Text>

                    <TextField
                        label="Leaves per Tree"
                        name="plantingMode.conversion.leavesPerTree"
                        defaultValue={String(config?.plantingMode?.conversion?.leavesPerTree || 100)}
                        description="How many leaves equal one tree"
                    />

                    <Checkbox
                        label="Enable Instant Planting"
                        name="plantingMode.instantEnabled"
                        defaultChecked={config?.plantingMode?.instantEnabled}
                        description="Plant trees immediately when threshold is reached"
                    />

                    <Checkbox
                        label="Enable Pledge Batching"
                        name="plantingMode.pledgeEnabled"
                        defaultChecked={config?.plantingMode?.pledgeEnabled ?? true}
                        description="Batch tree pledges weekly"
                    />
                </Form>
            )}

            {/* Funding Tab */}
            {activeTab === 'funding' && (
                <Fragment>
                    <Heading size="medium">Funding Allocation</Heading>
                    <Text>Configure which Afforestation projects receive your planted trees.</Text>

                    {projects.length > 0 ? (
                        <Table>
                            <Head>
                                <Cell><Text>Project</Text></Cell>
                                <Cell><Text>Location</Text></Cell>
                                <Cell><Text>Allocation %</Text></Cell>
                            </Head>
                            {projects.map(project => (
                                <Row key={project.id}>
                                    <Cell><Text>{project.name}</Text></Cell>
                                    <Cell><Text>{project.location}</Text></Cell>
                                    <Cell><Text>
                                        {funding?.projectCatalogSelection?.find(p => p.projectId === project.id)?.allocation?.value || 0}%
                                    </Text></Cell>
                                </Row>
                            ))}
                        </Table>
                    ) : (
                        <SectionMessage appearance="info">
                            <Text>Unable to load project catalog. Check your Afforestation API connection.</Text>
                        </SectionMessage>
                    )}
                </Fragment>
            )}
        </Fragment>
    );
};

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
);
