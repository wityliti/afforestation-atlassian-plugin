import React from 'react';
import { Text, Stack, Box, Button, Textfield, SectionMessage, Strong, Inline, Lozenge } from '@forge/react';
import { SectionHeader } from '../components';

/**
 * Account Tab - Connection management
 */
export const AccountTab = ({
    account,
    accountLoading,
    linkCode,
    setLinkCode,
    pendingSignup,
    setPendingSignup,
    onCreateAccount,
    onCheckConnection,
    onLoginToDashboard,
    onUnlinkAccount,
    onLinkAccount
}) => {
    const isLinked = account?.isLinked;

    return (
        <Stack space="space.150">
            <SectionHeader section="account" showLearnMore={true} />

            {isLinked ? (
                <Box
                    padding="space.200"
                    xcss={{
                        backgroundColor: 'color.background.success.subtle',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'color.border.success'
                    }}
                >
                    <Stack space="space.150">
                        <Inline space="space.100" alignBlock="center">
                            <Text size="large">🌳</Text>
                            <Strong>{account.companyName || 'Company Account'}</Strong>
                            <Lozenge appearance="success">Connected</Lozenge>
                        </Inline>
                        <Text size="small">
                            Impact from completed issues syncs automatically to your ESG dashboard.
                            Configure the tabs below to customize how impact is tracked.
                        </Text>
                        <Inline space="space.100">
                            <Button spacing="compact" appearance="primary" onClick={onLoginToDashboard} isLoading={accountLoading}>
                                Open Dashboard
                            </Button>
                            <Button spacing="compact" appearance="subtle" onClick={onUnlinkAccount} isLoading={accountLoading}>
                                Disconnect
                            </Button>
                        </Inline>
                    </Stack>
                </Box>
            ) : (
                <Stack space="space.200">
                    {/* Getting Started Guide */}
                    <SectionMessage appearance="information">
                        <Stack space="space.100">
                            <Strong>Getting Started</Strong>
                            <Text size="small">
                                Choose one of the options below to connect your Jira instance to Afforestation.
                                You'll need either a new company account or a link code from an existing account.
                            </Text>
                        </Stack>
                    </SectionMessage>

                    {/* Option 1: Create New Account */}
                    <Box padding="space.200" xcss={{ backgroundColor: 'elevation.surface.raised', borderRadius: '8px', border: '1px solid', borderColor: 'color.border.neutral' }}>
                        <Stack space="space.150">
                            <Inline space="space.100" alignBlock="center">
                                <Text size="large">🆕</Text>
                                <Strong>New to Afforestation?</Strong>
                            </Inline>
                            <Text size="small">
                                Create a new company account to start tracking your team's environmental impact.
                                You'll be redirected to complete signup, then return here to verify the connection.
                            </Text>
                            {!pendingSignup ? (
                                <Button appearance="primary" spacing="compact" onClick={onCreateAccount} isLoading={accountLoading}>
                                    Create Company Account
                                </Button>
                            ) : (
                                <Stack space="space.100">
                                    <SectionMessage appearance="information">
                                        <Text size="small">
                                            Complete the signup in the opened window, then click below to verify your connection.
                                        </Text>
                                    </SectionMessage>
                                    <Inline space="space.100">
                                        <Button appearance="primary" spacing="compact" onClick={onCheckConnection} isLoading={accountLoading}>
                                            Check Connection
                                        </Button>
                                        <Button appearance="subtle" spacing="compact" onClick={() => setPendingSignup(false)}>Cancel</Button>
                                    </Inline>
                                </Stack>
                            )}
                        </Stack>
                    </Box>

                    {/* Option 2: Link Existing Account */}
                    <Box padding="space.200" xcss={{ backgroundColor: 'elevation.surface.raised', borderRadius: '8px', border: '1px solid', borderColor: 'color.border.neutral' }}>
                        <Stack space="space.150">
                            <Inline space="space.100" alignBlock="center">
                                <Text size="large">🔗</Text>
                                <Strong>Have a link code?</Strong>
                            </Inline>
                            <Text size="small">
                                If your organization already has an Afforestation account, enter the link code
                                generated from <Strong>afforestation.org → Settings → Integrations → Generate Jira Link Code</Strong>
                            </Text>
                            <Inline space="space.100" alignBlock="center">
                                <Box xcss={{ flexGrow: '1' }}>
                                    <Textfield
                                        placeholder="AFOR_123_ABC123"
                                        value={linkCode}
                                        onChange={(e) => setLinkCode(e.target.value)}
                                    />
                                </Box>
                                <Button spacing="compact" onClick={onLinkAccount} isLoading={accountLoading} isDisabled={!linkCode.trim()}>
                                    Link Account
                                </Button>
                            </Inline>
                        </Stack>
                    </Box>
                </Stack>
            )}
        </Stack>
    );
};

export default AccountTab;
