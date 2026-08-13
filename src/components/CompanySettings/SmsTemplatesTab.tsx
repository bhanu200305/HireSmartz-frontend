import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Select, Spin } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button } from '../shared';
import { showToast } from '../shared/ui/toast';
import { rtkErrorMessage } from '../../shared/utils/api/rtkErrorMessage';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import {
  buildRoundOptionsFromCatalog,
  DEFAULT_SMS_ROUND_OPTIONS,
  filterTemplatesByRoundType,
  useGetSmsTemplateCatalogQuery,
  useGetSmsTemplateDetailsQuery,
  useRevertSmsTemplateMutation,
  useSaveSmsTemplateMutation,
} from '../../api/tenant-service/CompanySettings/smsTemplates';
import {
  expandSelectionToPlaceholders,
  getUnsupportedPlaceholders,
  hasAlteredProtectedPlaceholder,
  inputTypeToPlaceholderGuardKey,
  normalizeAllowedPlaceholders,
  resolveProtectedPlaceholderContent,
  selectionPartiallyIntersectsPlaceholder,
  shouldBlockPlaceholderKeyEdit,
  SMS_PLACEHOLDER_MODIFIED_MESSAGE,
} from './smsPlaceholderProtection';

/* ─────────────────────────────── Constants ──────────────────────────── */

const SMS_TEMPLATE_MAX_LENGTH = 640;

const PREVIEW_SAMPLE_VALUES: Record<string, string> = {
  candidateName: 'Alex Johnson',
  Name: 'Alex Johnson',
  name: 'Alex Johnson',
  companyName: 'Netsmartz Infotech Private Limited',
  jobTitle: 'Test Architect',
  position: 'Test Architect',
  interviewDate: 'March 20, 2026',
  interviewTime: '10:30 AM',
  datetime: 'March 20, 2026 at 10:30 AM',
  roundName: 'Video',
  signature: 'Netsmartz Infotech Private Limited',
  sessionType: 'video interview',
  startDate: 'March 20, 2026',
  startTime: '10:30 AM',
};

type PendingNavigation =
  | { type: 'company'; companyId: string | null }
  | { type: 'round'; round: string | null }
  | { type: 'template'; templateKey: string | null };

export interface SmsTemplatesTabProps {
  /**
   * When provided (DRG / My Company), company is resolved from auth context
   * and the Company dropdown is hidden.
   */
  fixedCompanyId?: string | null;
  showCompanySelect?: boolean;
}

/* ─────────────────────────────── Helpers ────────────────────────────── */

const buildPreviewContent = (content: string, companyName?: string): string => {
  if (!content) return '';

  const values: Record<string, string> = {
    ...PREVIEW_SAMPLE_VALUES,
    ...(companyName ? { companyName, signature: companyName } : {}),
  };

  return content.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (match, key: string) => {
    const resolved = values[key];
    return resolved !== undefined ? resolved : match;
  });
};

/* ─────────────────────────────── Component ──────────────────────────── */

const SmsTemplatesTab: React.FC<SmsTemplatesTabProps> = ({
  fixedCompanyId = null,
  showCompanySelect = true,
}) => {
  const isCompanySelectVisible = showCompanySelect && fixedCompanyId == null;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(fixedCompanyId ?? null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [isCustomized, setIsCustomized] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (fixedCompanyId != null) {
      setSelectedCompanyId(fixedCompanyId);
    }
  }, [fixedCompanyId]);

  const { data: companiesRaw = [], isLoading: companiesLoading } = useGetCompaniesDropdownQuery(
    undefined,
    { skip: !isCompanySelectVisible }
  );
  const companies = useMemo(() => companiesRaw.filter((company) => !company.owner), [companiesRaw]);

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return undefined;
    return companies.find((company) => company.id === selectedCompanyId)?.companyName;
  }, [companies, selectedCompanyId]);

  const {
    data: catalog = [],
    isLoading: isCatalogLoading,
    isFetching: isCatalogFetching,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useGetSmsTemplateCatalogQuery(selectedCompanyId as string, {
    skip: selectedCompanyId == null,
  });

  /**
   * Round Type options come from the catalog response (unique roundType values).
   * Fall back to defaults only when the catalog has no resolvable round types yet.
   */
  const roundOptions = useMemo(() => {
    const fromCatalog = buildRoundOptionsFromCatalog(catalog);
    if (fromCatalog.length > 0) return fromCatalog;
    if (isCatalogLoading || isCatalogFetching) return [];
    return DEFAULT_SMS_ROUND_OPTIONS;
  }, [catalog, isCatalogFetching, isCatalogLoading]);

  const filteredTemplates = useMemo(() => {
    const matched = filterTemplatesByRoundType(catalog, selectedRound);
    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, selectedRound]);

  const selectedCatalogItem = useMemo(
    () => catalog.find((item) => item.templateKey === selectedTemplateKey) ?? null,
    [catalog, selectedTemplateKey]
  );

  // Drop a stale round selection if it is no longer present in the catalog-derived options.
  useEffect(() => {
    if (!selectedRound || roundOptions.length === 0) return;
    const stillValid = roundOptions.some((option) => option.value === selectedRound);
    if (!stillValid) {
      setSelectedRound(null);
      setSelectedTemplateKey(null);
      setContent('');
      setSavedContent('');
      setIsCustomized(false);
    }
  }, [roundOptions, selectedRound]);

  const {
    data: templateDetails,
    isLoading: isDetailsLoading,
    isFetching: isDetailsFetching,
    isError: isDetailsError,
    refetch: refetchTemplateDetails,
  } = useGetSmsTemplateDetailsQuery(
    {
      templateKey: selectedTemplateKey as string,
      companyId: selectedCompanyId as string,
    },
    { skip: selectedCompanyId == null || !selectedTemplateKey }
  );

  const [saveSmsTemplate, { isLoading: isSaving }] = useSaveSmsTemplateMutation();
  const [revertSmsTemplate, { isLoading: isReverting }] = useRevertSmsTemplateMutation();

  const maxLength =
    templateDetails?.maxLength ?? selectedCatalogItem?.maxLength ?? SMS_TEMPLATE_MAX_LENGTH;
  const isDirty = content !== savedContent;
  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isBusy = isSaving || isReverting || isDetailsFetching || isCatalogFetching;

  useEffect(() => {
    if (!selectedTemplateKey) {
      setContent('');
      setSavedContent('');
      setIsCustomized(false);
      return;
    }

    // Prefer details API; fall back to catalog row (which already includes currentContent).
    if (templateDetails) {
      if (templateDetails.templateKey && templateDetails.templateKey !== selectedTemplateKey) {
        return;
      }
      setContent(templateDetails.currentContent ?? '');
      setSavedContent(templateDetails.currentContent ?? '');
      setIsCustomized(Boolean(templateDetails.isCustomized));
      return;
    }

    if (selectedCatalogItem) {
      setContent(selectedCatalogItem.currentContent ?? '');
      setSavedContent(selectedCatalogItem.currentContent ?? '');
      setIsCustomized(Boolean(selectedCatalogItem.isCustomized));
    }
  }, [selectedTemplateKey, templateDetails, selectedCatalogItem]);

  const allowedPlaceholders = useMemo(
    () =>
      normalizeAllowedPlaceholders(
        templateDetails?.allowedPlaceholders ??
          templateDetails?.placeholders ??
          selectedCatalogItem?.allowedPlaceholders
      ),
    [
      selectedCatalogItem?.allowedPlaceholders,
      templateDetails?.allowedPlaceholders,
      templateDetails?.placeholders,
    ]
  );

  const previewContent = useMemo(
    () => buildPreviewContent(content, selectedCompanyName),
    [content, selectedCompanyName]
  );

  const resetEditorState = useCallback(() => {
    setSelectedRound(null);
    setSelectedTemplateKey(null);
    setContent('');
    setSavedContent('');
    setIsCustomized(false);
  }, []);

  const applyPendingNavigation = useCallback(
    (pending: PendingNavigation) => {
      if (pending.type === 'company') {
        setSelectedCompanyId(pending.companyId);
        resetEditorState();
        return;
      }
      if (pending.type === 'round') {
        setSelectedRound(pending.round);
        setSelectedTemplateKey(null);
        setContent('');
        setSavedContent('');
        setIsCustomized(false);
        return;
      }
      setSelectedTemplateKey(pending.templateKey);
      setContent('');
      setSavedContent('');
      setIsCustomized(false);
    },
    [resetEditorState]
  );

  const requestNavigation = useCallback(
    (pending: PendingNavigation) => {
      if (isDirty) {
        setPendingNavigation(pending);
        return;
      }
      applyPendingNavigation(pending);
    },
    [applyPendingNavigation, isDirty]
  );

  const handleCompanyChange = (companyId: string | null) => {
    requestNavigation({ type: 'company', companyId });
  };

  const handleRoundChange = (round: string | null) => {
    requestNavigation({ type: 'round', round });
  };

  const handleTemplateChange = (templateKey: string | null) => {
    requestNavigation({ type: 'template', templateKey });
  };

  const handleDiscardChanges = () => {
    if (!pendingNavigation) return;
    applyPendingNavigation(pendingNavigation);
    setPendingNavigation(null);
  };

  const applyContentValue = useCallback(
    (value: string) => {
      const next = value.length <= maxLength ? value : value.slice(0, maxLength);
      contentRef.current = next;
      setContent(next);
    },
    [maxLength]
  );

  const rejectEditorChange = useCallback(() => {
    setEditorEpoch((epoch) => epoch + 1);
  }, []);

  const handleContentChange = (nextValue: string) => {
    const previousValue = contentRef.current;
    const resolution = resolveProtectedPlaceholderContent(
      previousValue,
      nextValue,
      allowedPlaceholders
    );

    if (!resolution.accepted) {
      showToast({
        type: 'error',
        message: SMS_PLACEHOLDER_MODIFIED_MESSAGE,
      });
      rejectEditorChange();
      return;
    }

    applyContentValue(resolution.value);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    if (
      shouldBlockPlaceholderKeyEdit(
        contentRef.current,
        target.selectionStart,
        target.selectionEnd,
        event.key
      )
    ) {
      event.preventDefault();
      if (target.selectionStart !== target.selectionEnd) {
        const expanded = expandSelectionToPlaceholders(
          contentRef.current,
          target.selectionStart,
          target.selectionEnd
        );
        target.setSelectionRange(expanded.start, expanded.end);
      }
    }
  };

  const handleEditorBeforeInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    const target = event.currentTarget;
    const guardKey = inputTypeToPlaceholderGuardKey(nativeEvent.inputType || '');
    if (!guardKey) return;

    if (
      shouldBlockPlaceholderKeyEdit(
        contentRef.current,
        target.selectionStart,
        target.selectionEnd,
        guardKey
      )
    ) {
      event.preventDefault();
      if (target.selectionStart !== target.selectionEnd) {
        const expanded = expandSelectionToPlaceholders(
          contentRef.current,
          target.selectionStart,
          target.selectionEnd
        );
        target.setSelectionRange(expanded.start, expanded.end);
      }
    }
  };

  const handleEditorCut = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const { selectionStart, selectionEnd } = target;

    if (selectionPartiallyIntersectsPlaceholder(contentRef.current, selectionStart, selectionEnd)) {
      event.preventDefault();
      const expanded = expandSelectionToPlaceholders(
        contentRef.current,
        selectionStart,
        selectionEnd
      );
      target.setSelectionRange(expanded.start, expanded.end);
    }
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const { selectionStart, selectionEnd } = target;

    if (selectionPartiallyIntersectsPlaceholder(contentRef.current, selectionStart, selectionEnd)) {
      event.preventDefault();
      const expanded = expandSelectionToPlaceholders(
        contentRef.current,
        selectionStart,
        selectionEnd
      );
      target.setSelectionRange(expanded.start, expanded.end);
      return;
    }

    const pastedText = event.clipboardData.getData('text');
    if (!pastedText) return;

    const nextValue =
      contentRef.current.slice(0, selectionStart) +
      pastedText +
      contentRef.current.slice(selectionEnd);

    const resolution = resolveProtectedPlaceholderContent(
      contentRef.current,
      nextValue,
      allowedPlaceholders
    );
    if (!resolution.accepted) {
      event.preventDefault();
      showToast({
        type: 'error',
        message: SMS_PLACEHOLDER_MODIFIED_MESSAGE,
      });
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyId || !selectedTemplateKey) {
      showToast({ type: 'error', message: 'Please select a company and template first.' });
      return;
    }
    if (!content.trim()) {
      showToast({ type: 'error', message: 'Template content is required.' });
      return;
    }
    if (isOverLimit) {
      showToast({
        type: 'error',
        message: `Template content cannot exceed ${maxLength} characters.`,
      });
      return;
    }

    if (hasAlteredProtectedPlaceholder(savedContent, content)) {
      showToast({
        type: 'error',
        message: SMS_PLACEHOLDER_MODIFIED_MESSAGE,
      });
      return;
    }

    if (allowedPlaceholders.length > 0) {
      const unsupported = getUnsupportedPlaceholders(content, allowedPlaceholders);
      if (unsupported.length > 0) {
        showToast({
          type: 'error',
          message: SMS_PLACEHOLDER_MODIFIED_MESSAGE,
        });
        return;
      }
    }

    try {
      await saveSmsTemplate({
        templateKey: selectedTemplateKey,
        companyId: selectedCompanyId,
        content,
      }).unwrap();
      setSavedContent(content);
      setIsCustomized(true);
      showToast({ type: 'success', message: 'SMS template saved successfully.' });
      await refetchTemplateDetails();
    } catch (error) {
      showToast({ type: 'error', message: rtkErrorMessage(error) });
    }
  };

  const handleConfirmRevert = async () => {
    if (!selectedCompanyId || !selectedTemplateKey || isReverting) return;

    try {
      const reverted = await revertSmsTemplate({
        templateKey: selectedTemplateKey,
        companyId: selectedCompanyId,
      }).unwrap();

      setIsRevertModalOpen(false);
      showToast({ type: 'success', message: 'SMS template reverted to default.' });

      if (reverted?.currentContent != null) {
        setContent(reverted.currentContent);
        setSavedContent(reverted.currentContent);
        setIsCustomized(Boolean(reverted.isCustomized));
      }

      await Promise.all([refetchTemplateDetails(), refetchCatalog()]);
    } catch (error) {
      showToast({ type: 'error', message: rtkErrorMessage(error) });
    }
  };

  const canEdit = selectedCompanyId != null && Boolean(selectedTemplateKey);
  const canSave = canEdit && isDirty && !isOverLimit && Boolean(content.trim()) && !isBusy;
  const canRevert = canEdit && isCustomized && !isBusy;
  const isRoundEnabled = selectedCompanyId != null && !isBusy;
  const isTemplateEnabled =
    selectedCompanyId != null && Boolean(selectedRound) && !isBusy && !isCatalogLoading;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="min-w-0">
          <h2 className="heading-font text-2xl font-semibold text-[#1e3a5f] mb-1">SMS Templates</h2>
          <p className="text-sm text-gray-500 roboto-font max-w-3xl">
            Customize the SMS templates used by your company. Changes only affect your organization
            and do not modify system defaults.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            type="button"
            className="h-10 px-5 border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 rounded-md font-semibold text-sm uppercase tracking-wide"
            onClick={() => setIsRevertModalOpen(true)}
            disabled={!canRevert}
          >
            Revert to Default
          </Button>
          <Button
            type="button"
            className="h-10 px-5 rounded-md font-semibold text-sm uppercase tracking-wide text-white bg-button hover:opacity-90 disabled:opacity-50"
            onClick={handleSave}
            disabled={!canSave}
            loading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Left: configuration ─────────────────────────────────────── */}
        <div
          className={`flex-1 min-w-0 w-full bg-white ${
            isCompanySelectVisible ? 'border border-gray-200 rounded-xl p-5' : ''
          }`}
        >
          {isCompanySelectVisible && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2 roboto-font">
                Company
              </label>
              <Select
                placeholder="Select a Company"
                loading={companiesLoading}
                value={selectedCompanyId ?? undefined}
                onChange={(value) => handleCompanyChange(value ?? null)}
                allowClear
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={companies.map((company) => ({
                  value: company.id,
                  label: company.companyName,
                }))}
                className="w-full"
                size="large"
                disabled={isBusy}
              />
            </div>
          )}

          <div className="border border-gray-200 rounded-xl p-4 sm:p-5">
            {selectedCompanyId != null && (
              <div className="mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    isCustomized && selectedTemplateKey
                      ? 'bg-green-100 text-green-700'
                      : 'bg-[#E8F1FF] text-[#1E5EFF]'
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isCustomized && selectedTemplateKey ? 'bg-green-600' : 'bg-[#1E5EFF]'
                    }`}
                  />
                  {isCustomized && selectedTemplateKey
                    ? 'Customized Template'
                    : 'Using Default Template'}
                </span>
              </div>
            )}

            <Spin spinning={Boolean(selectedCompanyId) && (isCatalogLoading || isDetailsLoading)}>
              {selectedCompanyId == null ? (
                <div className="flex items-center justify-center h-48 text-gray-400 roboto-font text-sm">
                  {isCompanySelectVisible
                    ? 'Select a company above to load SMS templates.'
                    : 'Unable to determine company. Please re-login.'}
                </div>
              ) : (
                <>
                  {isCatalogError && !isCatalogLoading && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm roboto-font">
                      Failed to load SMS templates for this company. Please try again.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 roboto-font">
                        Select Round
                      </label>
                      <Select
                        placeholder="Select Interview Round"
                        loading={isCatalogLoading || isCatalogFetching}
                        value={selectedRound ?? undefined}
                        onChange={(value) => handleRoundChange(value ?? null)}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                          String(option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        options={roundOptions.map((round) => ({
                          value: round.value,
                          label: round.label,
                        }))}
                        className="w-full"
                        size="large"
                        disabled={!isRoundEnabled}
                        notFoundContent={
                          isCatalogLoading || isCatalogFetching
                            ? 'Loading round types…'
                            : 'No round types found'
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 roboto-font">
                        Select Template
                      </label>
                      <Select
                        placeholder={
                          selectedRound ? 'Select a Template' : 'Select a Round Type first'
                        }
                        loading={isCatalogLoading || isCatalogFetching}
                        value={selectedTemplateKey ?? undefined}
                        onChange={(value) => handleTemplateChange(value ?? null)}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                          String(option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        options={filteredTemplates.map((template) => ({
                          value: template.templateKey,
                          label: template.name,
                        }))}
                        className="w-full"
                        size="large"
                        disabled={!isTemplateEnabled}
                        notFoundContent={
                          !selectedRound
                            ? 'Select a Round Type first'
                            : isCatalogLoading || isCatalogFetching
                              ? 'Loading templates…'
                              : 'No templates found for this Round Type'
                        }
                      />
                    </div>
                  </div>

                  {selectedTemplateKey && isDetailsError && !isDetailsLoading && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm roboto-font">
                      Failed to load template details. Please select the template again.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 roboto-font">
                      Template Content<span className="text-red-500">*</span>
                    </label>
                    <TextArea
                      key={`sms-template-editor-${selectedTemplateKey ?? 'none'}-${editorEpoch}`}
                      value={content}
                      onChange={(event) => handleContentChange(event.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onBeforeInput={handleEditorBeforeInput}
                      onCut={handleEditorCut}
                      onPaste={handleEditorPaste}
                      placeholder={
                        selectedTemplateKey
                          ? 'Edit SMS template content…'
                          : 'Select a template to edit its content'
                      }
                      rows={8}
                      disabled={!canEdit || isBusy}
                      className="rounded-lg text-sm !min-h-[180px]"
                      status={isOverLimit ? 'error' : undefined}
                    />
                    <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-xs text-red-500 roboto-font">
                        Please note we can&apos;t change the main content given in {"'{}'"}
                      </p>
                      <p className="text-xs text-gray-400 roboto-font sm:text-right shrink-0">
                        {characterCount}/{maxLength} Characters
                      </p>
                    </div>
                  </div>
                </>
              )}
            </Spin>
          </div>
        </div>

        {/* ── Right: live preview ─────────────────────────────────────── */}
        <div className="w-full xl:w-[340px] shrink-0">
          <h3 className="heading-font text-base font-semibold text-gray-800 mb-3">Live Preview</h3>
          <div className="min-h-[320px] rounded-xl border border-gray-200 bg-[#F5F6F8] p-5">
            {previewContent ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6 roboto-font">
                {previewContent}
              </p>
            ) : (
              <p className="text-sm text-gray-400 roboto-font">
                Select a template to see a live preview of the SMS message.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Revert confirmation */}
      <Modal
        open={isRevertModalOpen}
        onCancel={() => {
          if (!isReverting) setIsRevertModalOpen(false);
        }}
        footer={null}
        centered
        closable={false}
        maskClosable={!isReverting}
        width={480}
        styles={{ content: { borderRadius: '16px', padding: '32px 24px 24px' } }}
      >
        <div className="text-center">
          <h3 className="heading-font text-xl font-semibold text-gray-900 mb-3">
            Revert to Default Template?
          </h3>
          <p className="text-sm text-gray-700 roboto-font mb-2">
            This will discard your customized version and restore the platform default SMS template.
          </p>
          <p className="text-sm text-red-500 roboto-font mb-6">This action cannot be undone.</p>
          <div className="flex gap-3 justify-center">
            <Button
              type="button"
              className="min-w-[120px] h-11 border border-gray-400 text-gray-800 bg-white hover:bg-gray-50 rounded-md font-semibold text-sm uppercase"
              onClick={() => setIsRevertModalOpen(false)}
              disabled={isReverting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-[120px] h-11 rounded-md font-semibold text-sm uppercase text-white bg-button hover:opacity-90"
              onClick={handleConfirmRevert}
              loading={isReverting}
              disabled={isReverting}
            >
              Revert
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unsaved changes */}
      <Modal
        open={pendingNavigation != null}
        onCancel={() => setPendingNavigation(null)}
        footer={null}
        centered
        closable={false}
        width={480}
        styles={{ content: { borderRadius: '16px', padding: '32px 24px 24px' } }}
      >
        <div className="text-center">
          <h3 className="heading-font text-xl font-semibold text-gray-900 mb-3">Unsaved Changes</h3>
          <p className="text-sm text-gray-700 roboto-font mb-6">
            You have unsaved changes to this template. Do you want to discard them?
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              type="button"
              className="min-w-[120px] h-11 border border-gray-400 text-gray-800 bg-white hover:bg-gray-50 rounded-md font-semibold text-sm uppercase"
              onClick={() => setPendingNavigation(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-[150px] h-11 rounded-md font-semibold text-sm uppercase text-white bg-linear-to-r from-[#3CB6EC] to-[#263DAA] hover:opacity-90"
              onClick={handleDiscardChanges}
            >
              Discard Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SmsTemplatesTab;
