import React from 'react';
import { Text, Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@forge/react';

/**
 * Confirmation modal for destructive actions
 */
export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', appearance = 'danger' }) => (
    <ModalTransition>
        {isOpen && (
            <Modal onClose={onClose}>
                <ModalHeader>
                    <ModalTitle appearance={appearance}>{title}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <Text>{message}</Text>
                </ModalBody>
                <ModalFooter>
                    <Button appearance="subtle" onClick={onClose}>Cancel</Button>
                    <Button appearance={appearance} onClick={onConfirm}>{confirmLabel}</Button>
                </ModalFooter>
            </Modal>
        )}
    </ModalTransition>
);

export default ConfirmationModal;
