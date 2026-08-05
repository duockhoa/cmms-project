-- Trigger preventing UPDATE on WorkflowHistory
CREATE TRIGGER IF NOT EXISTS prevent_update_workflow_history
BEFORE UPDATE ON WorkflowHistory
BEGIN
    SELECT RAISE(FAIL, 'WorkflowHistory is immutable and cannot be updated.');
END;

-- Trigger preventing DELETE on WorkflowHistory
CREATE TRIGGER IF NOT EXISTS prevent_delete_workflow_history
BEFORE DELETE ON WorkflowHistory
BEGIN
    SELECT RAISE(FAIL, 'WorkflowHistory is immutable and cannot be deleted.');
END;
