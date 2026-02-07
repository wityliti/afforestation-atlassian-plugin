import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import {
    Text,
    Stack,
    Box,
    Heading,
    Button,
    Textfield,
    Checkbox,
    Select,
    SectionMessage,
    Tabs,
    TabList,
    Tab,
    TabPanel
} from '@forge/react';

const AdminPage = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                const cfg = await invoke('getConfig');
                setConfig(cfg);
            } catch (err) {
                setMessage({ type: 'error', text: `Failed to load: ${err.message}` });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await invoke('setConfig', config);
            setMessage({ type: 'success', text: 'Configuration saved!' });
        } catch (err) {
            setMessage({ type: 'error', text: `Failed to save: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (path, value) => {
        const parts = path.split('.');
        const newConfig = { ...config };
        let target = newConfig;
        for (let i = 0; i < parts.length - 1; i++) {
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;
        setConfig(newConfig);
    };

    if (loading) {
        return <Text>Loading configuration...</Text>;
    }

    return (
        <Stack space="space.200">
            <Heading as="h1">🌳 Afforestation Impact Settings</Heading>

            {message && (
                <SectionMessage appearance={message.type === 'error' ? 'error' : 'success'}>
                    <Text>{message.text}</Text>
                </SectionMessage>
            )}

            <Tabs id="config-tabs" onChange={setActiveTab} selected={activeTab}>
                <TabList>
                    <Tab>Completion</Tab>
                    <Tab>Scope</Tab>
                    <Tab>Scoring</Tab>
                    <Tab>Planting</Tab>
                </TabList>

                {/* Completion Tab */}
                <TabPanel>
                    <Stack space="space.150">
                        <Heading as="h3">Completion Detection</Heading>
                        <Text>Define what counts as a "completed" issue.</Text>

                        <Checkbox
                            label="Match by Status Name"
                            isChecked={config?.completion?.statusName?.enabled}
                            onChange={(e) => updateConfig('completion.statusName.enabled', e.target.checked)}
                        />

                        <Textfield
                            label="Done Status Names (comma-separated)"
                            value={config?.completion?.statusName?.doneStatusNames?.join(', ') || ''}
                            onChange={(e) => updateConfig('completion.statusName.doneStatusNames', e.target.value.split(',').map(s => s.trim()))}
                        />

                        <Checkbox
                            label="Match by Status Category"
                            isChecked={config?.completion?.statusCategory?.enabled}
                            onChange={(e) => updateConfig('completion.statusCategory.enabled', e.target.checked)}
                        />

                        <Textfield
                            label="Reaward Multiplier (0-1)"
                            value={String(config?.completion?.reopenPolicy?.reawardMultiplier || 0.5)}
                            onChange={(e) => updateConfig('completion.reopenPolicy.reawardMultiplier', parseFloat(e.target.value))}
                        />
                    </Stack>
                </TabPanel>

                {/* Scope Tab */}
                <TabPanel>
                    <Stack space="space.150">
                        <Heading as="h3">Scope Configuration</Heading>
                        <Text>Define which issues earn impact points.</Text>

                        <Textfield
                            label="Included Projects (comma-separated, empty = all)"
                            value={config?.scope?.includedProjects?.join(', ') || ''}
                            onChange={(e) => updateConfig('scope.includedProjects', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />

                        <Textfield
                            label="Excluded Projects"
                            value={config?.scope?.excludedProjects?.join(', ') || ''}
                            onChange={(e) => updateConfig('scope.excludedProjects', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />

                        <Textfield
                            label="Label Exclusions"
                            value={config?.scope?.labelExclusions?.join(', ') || ''}
                            onChange={(e) => updateConfig('scope.labelExclusions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                    </Stack>
                </TabPanel>

                {/* Scoring Tab */}
                <TabPanel>
                    <Stack space="space.150">
                        <Heading as="h3">Scoring Configuration</Heading>

                        <Textfield
                            label="Base Points per Issue"
                            value={String(config?.scoring?.basePoints || 10)}
                            onChange={(e) => updateConfig('scoring.basePoints', parseInt(e.target.value))}
                        />

                        <Textfield
                            label="Story Point Multiplier"
                            value={String(config?.scoring?.storyPointMultiplier || 5)}
                            onChange={(e) => updateConfig('scoring.storyPointMultiplier', parseInt(e.target.value))}
                        />

                        <Textfield
                            label="Max Points per Issue"
                            value={String(config?.scoring?.caps?.perIssueMax || 200)}
                            onChange={(e) => updateConfig('scoring.caps.perIssueMax', parseInt(e.target.value))}
                        />

                        <Textfield
                            label="Max Points per User per Day"
                            value={String(config?.scoring?.caps?.perUserPerDay || 200)}
                            onChange={(e) => updateConfig('scoring.caps.perUserPerDay', parseInt(e.target.value))}
                        />
                    </Stack>
                </TabPanel>

                {/* Planting Tab */}
                <TabPanel>
                    <Stack space="space.150">
                        <Heading as="h3">Planting Mode</Heading>

                        <Textfield
                            label="Leaves per Tree"
                            value={String(config?.plantingMode?.conversion?.leavesPerTree || 100)}
                            onChange={(e) => updateConfig('plantingMode.conversion.leavesPerTree', parseInt(e.target.value))}
                        />

                        <Checkbox
                            label="Enable Instant Planting"
                            isChecked={config?.plantingMode?.instantEnabled}
                            onChange={(e) => updateConfig('plantingMode.instantEnabled', e.target.checked)}
                        />

                        <Checkbox
                            label="Enable Pledge Batching (Weekly)"
                            isChecked={config?.plantingMode?.pledgeEnabled}
                            onChange={(e) => updateConfig('plantingMode.pledgeEnabled', e.target.checked)}
                        />
                    </Stack>
                </TabPanel>
            </Tabs>

            <Button appearance="primary" onClick={handleSave} isLoading={saving}>
                Save Configuration
            </Button>
        </Stack>
    );
};

export default AdminPage;
