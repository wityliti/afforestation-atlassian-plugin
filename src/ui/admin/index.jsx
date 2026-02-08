import React, { useState, useEffect } from 'react';
import { invoke, router } from '@forge/bridge';
import ForgeReconciler, {
    Text,
    Stack,
    Box,
    Button,
    SectionMessage,
    Tabs,
    TabList,
    Tab,
    TabPanel,
    ProgressBar,
    Inline,
    Lozenge
} from '@forge/react';

// Components
import { TabStatusIndicator, ConfirmationModal } from './components';

// Tabs
import { AccountTab, CompletionTab, ScopeTab, ScoringTab, FundingTab, SettingsTab } from './tabs';

// ============ Main Admin Component ============

const AdminPage = () => {
    const [config, setConfig] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    // Account state
    const [account, setAccount] = useState(null);
    const [accountLoading, setAccountLoading] = useState(false);
    const [linkCode, setLinkCode] = useState('');
    const [pendingSignup, setPendingSignup] = useState(false);

    // Selected project to add in Funding tab
    const [selectedProjectId, setSelectedProjectId] = useState('');

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, data: null });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [cfg, projects, accountStatus] = await Promise.all([
                    invoke('getConfig'),
                    invoke('getCatalogProjects'),
                    invoke('getAccountStatus')
                ]);
                setConfig(cfg);
                setCatalog(projects || []);
                setAccount(accountStatus);
            } catch (err) {
                setMessage({ type: 'error', text: `Failed to load configuration: ${err.message}` });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // ============ Config Manipulation ============

    const updateConfig = (path, value) => {
        const parts = path.split('.');
        const newConfig = JSON.parse(JSON.stringify(config || {}));
        let current = newConfig;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        setConfig(newConfig);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await invoke('saveConfig', { config });
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: `Failed to save: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    // ============ Account Handlers ============

    const handleCreateAccount = async () => {
        setAccountLoading(true);
        setMessage(null);
        try {
            const result = await invoke('createSignupToken');
            if (result.success && result.redirectUrl) {
                await router.open(result.redirectUrl);
                setPendingSignup(true);
            } else {
                setMessage({ type: 'error', text: result.error || 'Could not generate signup link.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `Error creating account: ${err.message}` });
        } finally {
            setAccountLoading(false);
        }
    };

    const handleCheckConnection = async () => {
        setAccountLoading(true);
        try {
            const status = await invoke('getAccountStatus');
            setAccount(status);
            if (status?.isLinked) {
                setPendingSignup(false);
                setMessage({ type: 'success', text: 'Successfully connected to Afforestation!' });
            } else {
                setMessage({ type: 'warning', text: 'Not connected yet. Complete signup and try again.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `Connection check failed: ${err.message}` });
        } finally {
            setAccountLoading(false);
        }
    };

    const handleLinkAccount = async () => {
        if (!linkCode.trim()) return;
        setAccountLoading(true);
        setMessage(null);
        try {
            const result = await invoke('linkWithCode', { code: linkCode.trim() });
            if (result.success) {
                setAccount(result.account);
                setLinkCode('');
                setMessage({ type: 'success', text: 'Account linked successfully!' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to link account.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `Link failed: ${err.message}` });
        } finally {
            setAccountLoading(false);
        }
    };

    const handleLoginToDashboard = async () => {
        setAccountLoading(true);
        try {
            const result = await invoke('createLoginToken');
            if (result.success && result.redirectUrl) {
                await router.open(result.redirectUrl);
            } else {
                setMessage({ type: 'error', text: result.error || 'Could not open dashboard.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `Error: ${err.message}` });
        } finally {
            setAccountLoading(false);
        }
    };

    const handleUnlinkAccount = () => {
        setConfirmModal({ isOpen: true, type: 'disconnect', data: null });
    };

    const confirmUnlinkAccount = async () => {
        setConfirmModal({ isOpen: false, type: null, data: null });
        setAccountLoading(true);
        try {
            const result = await invoke('unlinkAccount');
            if (result.success) {
                setAccount({ isLinked: false });
                setMessage({ type: 'success', text: 'Account disconnected successfully.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `Disconnect failed: ${err.message}` });
        } finally {
            setAccountLoading(false);
        }
    };

    // ============ Funding Handlers ============

    const handleAddProject = () => {
        if (!selectedProjectId) return;
        const project = catalog.find(p => p.id === selectedProjectId);
        if (!project) return;

        const current = config?.funding?.projectCatalogSelection || [];
        const updated = [...current, { projectId: project.id, name: project.name, allocation: { value: 0 } }];
        updateConfig('funding.projectCatalogSelection', updated);
        setSelectedProjectId('');
    };

    const handleRemoveProject = (projectId) => {
        setConfirmModal({ isOpen: true, type: 'removeProject', data: { projectId } });
    };

    const confirmRemoveProject = () => {
        const projectId = confirmModal.data?.projectId;
        setConfirmModal({ isOpen: false, type: null, data: null });
        if (!projectId) return;

        const current = config?.funding?.projectCatalogSelection || [];
        updateConfig('funding.projectCatalogSelection', current.filter(p => p.projectId !== projectId));
    };

    const handleAllocationChange = (projectId, value) => {
        const current = config?.funding?.projectCatalogSelection || [];
        const updated = current.map(p =>
            p.projectId === projectId ? { ...p, allocation: { value: parseFloat(value) || 0 } } : p
        );
        updateConfig('funding.projectCatalogSelection', updated);
    };

    // ============ Tab Configuration Status ============

    const checkTabConfigured = (tabName) => {
        if (!config) return false;
        switch (tabName) {
            case 'account':
                return account?.isLinked === true;
            case 'completion':
                return config.completion?.statusCategory?.enabled || config.completion?.statusName?.enabled;
            case 'scope':
                return (config.scope?.includedProjects?.length > 0) || (config.scope?.excludedProjects?.length > 0);
            case 'scoring':
                return config.scoring?.basePoints > 0 || config.scoring?.storyPointMultiplier > 0;
            case 'funding':
                return (config.funding?.projectCatalogSelection?.length > 0);
            case 'settings':
                return config.plantingMode?.conversion?.leavesPerTree > 0;
            default:
                return false;
        }
    };

    if (loading) {
        return (
            <Box padding="space.400">
                <Stack space="space.200" alignInline="center">
                    <ProgressBar isIndeterminate />
                    <Text>Loading Grow for Jira configuration...</Text>
                </Stack>
            </Box>
        );
    }

    const isLinked = account?.isLinked;

    const notLinkedWarning = !isLinked ? (
        <SectionMessage appearance="warning">
            <Text>
                <strong>Account required:</strong> Connect your Afforestation account in the <strong>Account</strong> tab to enable this feature.
            </Text>
        </SectionMessage>
    ) : null;

    return (
        <Stack space="space.150">
            {/* Header */}
            <Inline spread="space-between" alignBlock="center">
                <Inline space="space.100" alignBlock="center">
                    {isLinked && account?.companyName && (
                        <>
                            <Text size="small">Connected to</Text>
                            <Lozenge appearance="success">{account.companyName}</Lozenge>
                        </>
                    )}
                    {!isLinked && <Lozenge appearance="moved">Not Connected</Lozenge>}
                </Inline>
                <Button
                    appearance="primary"
                    spacing="compact"
                    onClick={handleSave}
                    isLoading={saving}
                >
                    Save Changes
                </Button>
            </Inline>

            {message && (
                <SectionMessage appearance={message.type === 'error' ? 'error' : message.type === 'warning' ? 'warning' : 'success'}>
                    <Text>{message.text}</Text>
                </SectionMessage>
            )}

            <Tabs id="config-tabs" onChange={setActiveTab} selected={activeTab}>
                <TabList>
                    <Tab>
                        <Inline space="space.050" alignBlock="center">
                            <Text>Account</Text>
                            <TabStatusIndicator isConfigured={checkTabConfigured('account')} />
                        </Inline>
                    </Tab>
                    <Tab>
                        <Inline space="space.050" alignBlock="center">
                            <Text>Completion</Text>
                            <TabStatusIndicator isConfigured={checkTabConfigured('completion')} />
                        </Inline>
                    </Tab>
                    <Tab>
                        <Inline space="space.050" alignBlock="center">
                            <Text>Scope</Text>
                            <TabStatusIndicator isConfigured={checkTabConfigured('scope')} />
                        </Inline>
                    </Tab>
                    <Tab>
                        <Inline space="space.050" alignBlock="center">
                            <Text>Scoring</Text>
                            <TabStatusIndicator isConfigured={checkTabConfigured('scoring')} />
                        </Inline>
                    </Tab>
                    <Tab>
                        <Inline space="space.050" alignBlock="center">
                            <Text>Funding</Text>
                            <TabStatusIndicator isConfigured={checkTabConfigured('funding')} />
                        </Inline>
                    </Tab>
                    <Tab>
                        <Inline space="space.050" alignBlock="center">
                            <Text>Settings</Text>
                            <TabStatusIndicator isConfigured={checkTabConfigured('settings')} />
                        </Inline>
                    </Tab>
                </TabList>

                <TabPanel>
                    <AccountTab
                        account={account}
                        accountLoading={accountLoading}
                        linkCode={linkCode}
                        setLinkCode={setLinkCode}
                        pendingSignup={pendingSignup}
                        setPendingSignup={setPendingSignup}
                        onCreateAccount={handleCreateAccount}
                        onCheckConnection={handleCheckConnection}
                        onLoginToDashboard={handleLoginToDashboard}
                        onUnlinkAccount={handleUnlinkAccount}
                        onLinkAccount={handleLinkAccount}
                    />
                </TabPanel>

                <TabPanel>
                    <CompletionTab
                        config={config}
                        updateConfig={updateConfig}
                        notLinkedWarning={notLinkedWarning}
                    />
                </TabPanel>

                <TabPanel>
                    <ScopeTab
                        config={config}
                        updateConfig={updateConfig}
                        notLinkedWarning={notLinkedWarning}
                    />
                </TabPanel>

                <TabPanel>
                    <ScoringTab
                        config={config}
                        updateConfig={updateConfig}
                        notLinkedWarning={notLinkedWarning}
                    />
                </TabPanel>

                <TabPanel>
                    <FundingTab
                        config={config}
                        catalog={catalog}
                        selectedProjectId={selectedProjectId}
                        setSelectedProjectId={setSelectedProjectId}
                        onAddProject={handleAddProject}
                        onRemoveProject={handleRemoveProject}
                        onAllocationChange={handleAllocationChange}
                        notLinkedWarning={notLinkedWarning}
                    />
                </TabPanel>

                <TabPanel>
                    <SettingsTab
                        config={config}
                        updateConfig={updateConfig}
                        notLinkedWarning={notLinkedWarning}
                    />
                </TabPanel>
            </Tabs>

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen && confirmModal.type === 'disconnect'}
                onClose={() => setConfirmModal({ isOpen: false, type: null, data: null })}
                onConfirm={confirmUnlinkAccount}
                title="Disconnect Account"
                message="Are you sure you want to disconnect your Afforestation account? This will stop impact tracking until you reconnect. Your existing impact data will be preserved."
                confirmLabel="Disconnect"
                appearance="danger"
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen && confirmModal.type === 'removeProject'}
                onClose={() => setConfirmModal({ isOpen: false, type: null, data: null })}
                onConfirm={confirmRemoveProject}
                title="Remove Project"
                message="Are you sure you want to remove this project from your funding allocation? You'll need to redistribute the allocation percentage to other projects."
                confirmLabel="Remove"
                appearance="warning"
            />
        </Stack>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <AdminPage />
    </React.StrictMode>
);
