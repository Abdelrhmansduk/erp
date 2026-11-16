import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  ArrowRightLeft,
  Plus,
  X,
  CheckCircle2,
  ClipboardPaste,
  Percent,
} from 'lucide-react';
import {
  BOQItem,
  KasEstablishmentRow,
  KasWorkbookMeta,
  TenderRecord,
} from '../types/tenders';
import {
  kasNovemberWorkbooksService,
  KasWorkbookSystemSnapshot,
} from '../services/kasNovemberWorkbooksService';
import { RealBoqEngine } from '../services/realBoqEngine';
import { tafqeet } from '../services/tafqeetService';
import { useAppStore } from '../stores/appStore';
import {
  buildExecutivePdfFileName,
  generateExecutivePdfArtifact,
} from '../services/exportService';
import { shareViaEmail, shareViaWhatsApp } from '../services/quickShareService';
import { KasExactReplicaWorkbooksSection } from '../components/tenders/KasExactReplicaWorkbooksSection';

export const KasExactReplicaTablesPage: React.FC = () => {
  const { setActiveTab: setGlobalTab, addNotification } = useAppStore();

  const [establishments, setEstablishments] = useState<KasEstablishmentRow[]>(
    () => kasNovemberWorkbooksService.getEstablishments()
  );
  const [workbooksMeta, setWorkbooksMeta] = useState<KasWorkbookMeta[]>(() =>
    kasNovemberWorkbooksService.getWorkbooksMeta()
  );
  const [tendersList, setTendersList] = useState<TenderRecord[]>(() =>
    kasNovemberWorkbooksService.getTenders()
  );
  const [selectedTender, setSelectedTender] = useState<TenderRecord>(() => {
    const all = kasNovemberWorkbooksService.getTenders();
    const savedId = kasNovemberWorkbooksService.getSelectedTenderId();
    return all.find((t) => t.id === savedId) || all[0];
  });
  const [currentItems, setCurrentItems] = useState<BOQItem[]>(
    () => selectedTender?.items || []
  );

  // Filters
  const [activeWorkbookFilter, setActiveWorkbookFilter] =
    useState<string>('all');
  const [activeEstablishmentFilter, setActiveEstablishmentFilter] =
    useState<string>('all');
  const [sheetSearchQuery, setSheetSearchQuery] = useState<string>('');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() =>
    new Date().toLocaleTimeString('ar-SA')
  );

  // Undo / Redo Stack (50 steps)
  const [undoStack, setUndoStack] = useState<KasWorkbookSystemSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<KasWorkbookSystemSnapshot[]>([]);

  // Modals for Independent Section
  const [showNewSheetModal, setShowNewSheetModal] = useState<boolean>(false);
  const [showPasteItemsModal, setShowPasteItemsModal] = useState<boolean>(false);
  const [showMarginModal, setShowMarginModal] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [marginPct, setMarginPct] = useState<string>('15');
  const [newSheetForm, setNewSheetForm] = useState({
    sheetName: '',
    referenceNumber: `25113900${Math.floor(1000 + Math.random() * 9000)}`,
    title: '',
    entityName: 'مؤسسة خالد عبدالعزيز السليم للتجارة',
    clientName: 'منصة اعتماد الحكومية — المنافسات والمشتريات',
    workbookId: 'nov11_v1',
    supplyDuration: '15 يوم',
    validityDuration: '180 يوم',
  });

  // Load full 241 sheets and subscribe to real-time bi-directional updates from other KAS sections
  useEffect(() => {
    let mounted = true;
    void kasNovemberWorkbooksService.ensureFullWorkbooksLoaded().then((full) => {
      if (!mounted) return;
      setEstablishments(full.establishments);
      setTendersList(full.tenders);
      setWorkbooksMeta(full.workbooks);
      const savedId = kasNovemberWorkbooksService.getSelectedTenderId();
      const target =
        full.tenders.find((t) => t.id === savedId) ||
        full.tenders.find((t) => t.id === selectedTender?.id) ||
        full.tenders[0];
      if (target) {
        setSelectedTender(target);
        setCurrentItems(target.items || []);
      }
    });

    const unsubscribe = kasNovemberWorkbooksService.subscribe((payload) => {
      if (!mounted) return;
      setEstablishments([...payload.establishments]);
      setTendersList([...payload.tenders]);
      if (payload.workbooks && payload.workbooks.length > 0) {
        setWorkbooksMeta([...payload.workbooks]);
      }
      const activeId = payload.selectedTenderId || selectedTender?.id;
      const updatedSelected =
        payload.tenders.find((t) => t.id === activeId) || payload.tenders[0];
      if (updatedSelected) {
        setSelectedTender(updatedSelected);
        setCurrentItems(updatedSelected.items || []);
      }
      setLastSyncTimestamp(
        new Date(payload.timestamp).toLocaleTimeString('ar-SA')
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [selectedTender?.id]);

  const pushUndoSnapshot = useCallback(
    (actionLabel: string) => {
      const snap: KasWorkbookSystemSnapshot = {
        actionLabel,
        timestamp: new Date().toISOString(),
        establishments: establishments.map((e) => ({
          ...e,
          aliases: [...(e.aliases || [])],
        })),
        tenders: tendersList.map((t) => ({
          ...t,
          items: (t.items || []).map((it) => ({ ...it })),
        })),
        selectedTenderId: selectedTender.id,
      };
      setUndoStack((prev) => [...prev.slice(-49), snap]);
      setRedoStack([]);
    },
    [establishments, tendersList, selectedTender?.id]
  );

  const persistAndBroadcast = useCallback(
    (
      nextTenders: TenderRecord[],
      nextEstablishments?: KasEstablishmentRow[],
      nextSelectedId?: string
    ) => {
      kasNovemberWorkbooksService.saveState(
        nextTenders,
        nextEstablishments || establishments,
        nextSelectedId || selectedTender?.id,
        'kas-exact-sheets'
      );
    },
    [establishments, selectedTender?.id]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    const currentSnap: KasWorkbookSystemSnapshot = {
      actionLabel: prevSnap.actionLabel,
      timestamp: new Date().toISOString(),
      establishments: establishments.map((e) => ({
        ...e,
        aliases: [...(e.aliases || [])],
      })),
      tenders: tendersList.map((t) => ({
        ...t,
        items: (t.items || []).map((it) => ({ ...it })),
      })),
      selectedTenderId: selectedTender.id,
    };
    setRedoStack((r) => [...r, currentSnap]);
    setUndoStack((u) => u.slice(0, -1));

    setEstablishments(prevSnap.establishments);
    setTendersList(prevSnap.tenders);
    const restored =
      prevSnap.tenders.find((t) => t.id === prevSnap.selectedTenderId) ||
      prevSnap.tenders[0];
    if (restored) {
      setSelectedTender(restored);
      setCurrentItems(restored.items || []);
    }
    persistAndBroadcast(
      prevSnap.tenders,
      prevSnap.establishments,
      restored?.id
    );
    addNotification({
      title: 'تم التراجع (Undo)',
      message: `تم التراجع عن: ${prevSnap.actionLabel} ومزامنة القسم الآخر.`,
      type: 'info',
    });
  }, [
    undoStack,
    establishments,
    tendersList,
    selectedTender?.id,
    persistAndBroadcast,
    addNotification,
  ]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    const currentSnap: KasWorkbookSystemSnapshot = {
      actionLabel: nextSnap.actionLabel,
      timestamp: new Date().toISOString(),
      establishments: establishments.map((e) => ({
        ...e,
        aliases: [...(e.aliases || [])],
      })),
      tenders: tendersList.map((t) => ({
        ...t,
        items: (t.items || []).map((it) => ({ ...it })),
      })),
      selectedTenderId: selectedTender.id,
    };
    setUndoStack((u) => [...u, currentSnap]);
    setRedoStack((r) => r.slice(0, -1));

    setEstablishments(nextSnap.establishments);
    setTendersList(nextSnap.tenders);
    const restored =
      nextSnap.tenders.find((t) => t.id === nextSnap.selectedTenderId) ||
      nextSnap.tenders[0];
    if (restored) {
      setSelectedTender(restored);
      setCurrentItems(restored.items || []);
    }
    persistAndBroadcast(
      nextSnap.tenders,
      nextSnap.establishments,
      restored?.id
    );
    addNotification({
      title: 'تمت الإعادة (Redo)',
      message: `تمت إعادة: ${nextSnap.actionLabel} ومزامنة القسم الآخر.`,
      type: 'info',
    });
  }, [
    redoStack,
    establishments,
    tendersList,
    selectedTender?.id,
    persistAndBroadcast,
    addNotification,
  ]);

  const handleSelectTender = (tender: TenderRecord) => {
    setSelectedTender(tender);
    setCurrentItems(tender.items || []);
    kasNovemberWorkbooksService.setSelectedTenderId(
      tender.id,
      'kas-exact-sheets'
    );
  };

  // --- Establishments Handlers (syncs live to all KAS sections) ---
  const handleUpdateEstablishment = (
    index: number,
    field: 'name' | 'endingToday' | 'endingAfterToday',
    value: string | number
  ) => {
    pushUndoSnapshot(
      `تعديل جدول المؤسسات (${establishments[index]?.name || ''})`
    );
    const updated = establishments.map((est, idx) => {
      if (idx !== index) return est;
      if (field === 'name') {
        const newName = String(value);
        return {
          ...est,
          name: newName,
          aliases: Array.from(new Set([...(est.aliases || []), newName])),
        };
      }
      return {
        ...est,
        [field]: Math.max(0, Number(value) || 0),
      };
    });
    setEstablishments(updated);
    persistAndBroadcast(tendersList, updated);
  };

  const handleAddEstablishment = () => {
    pushUndoSnapshot('إضافة مؤسسة جديدة إلى جدول المؤسسات');
    const newEst: KasEstablishmentRow = {
      id: `est-${Date.now()}`,
      name: `مؤسسة كاس الجديدة (${establishments.length + 1})`,
      aliases: [],
      endingToday: 0,
      endingAfterToday: 0,
    };
    const updated = [...establishments, newEst];
    setEstablishments(updated);
    persistAndBroadcast(tendersList, updated);
    addNotification({
      title: 'تمت إضافة المؤسسة ومزامنة الأقسام',
      message: `تمت إضافة "${newEst.name}" في جدول المؤسسات وانعكست فوراً في القسم الآخر.`,
      type: 'success',
    });
  };

  const handleDuplicateEstablishment = (index: number) => {
    const target = establishments[index];
    if (!target) return;
    pushUndoSnapshot(`نسخ مؤسسة: ${target.name}`);
    const cloned: KasEstablishmentRow = {
      ...target,
      id: `est-clone-${Date.now()}`,
      name: `${target.name} (نسخة)`,
    };
    const updated = [
      ...establishments.slice(0, index + 1),
      cloned,
      ...establishments.slice(index + 1),
    ];
    setEstablishments(updated);
    persistAndBroadcast(tendersList, updated);
    addNotification({
      title: 'نسخ صف المؤسسة',
      message: `تم تكرار صف "${target.name}" ومزامنته مع القسم الآخر.`,
      type: 'success',
    });
  };

  const handleDeleteEstablishment = (index: number) => {
    if (establishments.length <= 1) return;
    const target = establishments[index];
    if (!target) return;
    pushUndoSnapshot(`حذف مؤسسة: ${target.name}`);
    const updated = establishments.filter((_, idx) => idx !== index);
    setEstablishments(updated);
    persistAndBroadcast(tendersList, updated);
    addNotification({
      title: 'حذف مؤسسة من الجدول',
      message: `تم حذف "${target.name}" ومزامنة القسم الآخر.`,
      type: 'info',
    });
  };

  const handleSyncEstablishmentsClosingCounts = () => {
    pushUndoSnapshot('مزامنة عدادات انتهاء اليوم وانتهاء بعد اليوم');
    const todayIso = new Date().toISOString().split('T')[0];
    const updated = establishments.map((est) => {
      const matching = tendersList.filter(
        (t) =>
          t.entityName === est.name ||
          (est.aliases &&
            est.aliases.some(
              (a) => t.entityName.includes(a) || a.includes(t.entityName)
            ))
      );
      let endingTodayCount = 0;
      let endingAfterCount = 0;
      for (const t of matching) {
        const closeDate = t.deadlineDate || t.submissionDate || '';
        if (closeDate === todayIso) endingTodayCount += 1;
        else endingAfterCount += 1;
      }
      return {
        ...est,
        endingToday: endingTodayCount,
        endingAfterToday: endingAfterCount,
      };
    });
    setEstablishments(updated);
    persistAndBroadcast(tendersList, updated);
    addNotification({
      title: 'تمت مزامنة عدادات المؤسسات',
      message:
        'تم تحديث أعمدة (انتهاء اليوم) و(انتهاء بعد اليوم) و(الإجمالى) في القسمين.',
      type: 'success',
    });
  };

  // --- Tender Header & Items Handlers (syncs live to all KAS sections) ---
  const handleInlineTenderHeaderChange = (
    field:
      | 'entityName'
      | 'referenceNumber'
      | 'title'
      | 'clientName'
      | 'sheetName'
      | 'category'
      | 'submissionDate'
      | 'deadlineDate'
      | 'estimatedBudget'
      | 'supplyDuration'
      | 'validityDuration',
    val: string | number
  ) => {
    pushUndoSnapshot(
      `تعديل ترويسة الورقة (${selectedTender.sheetName || selectedTender.referenceNumber})`
    );
    const updatedTender: TenderRecord = {
      ...selectedTender,
      [field]: field === 'estimatedBudget' ? Number(val) || 0 : val,
      ...(field === 'validityDuration'
        ? {
            commitmentDays:
              parseInt(String(val), 10) ||
              selectedTender.commitmentDays ||
              180,
          }
        : {}),
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
  };

  const handleSaveCurrentEntityToEstablishments = () => {
    const clean = (selectedTender.entityName || '').trim();
    if (!clean) return;
    pushUndoSnapshot(`إضافة مؤسسة للقائمة المنسدلة: ${clean}`);
    kasNovemberWorkbooksService.addEstablishmentByName(clean);
    setEstablishments([...kasNovemberWorkbooksService.getEstablishments()]);
    addNotification({
      title: 'تم حفظ المؤسسة بالقائمة',
      message: `تمت إضافة "${clean}" إلى جدول المؤسسات في كافة أقسام كاس.`,
      type: 'success',
    });
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'unit' | 'quantity' | 'unitPrice',
    val: string | number
  ) => {
    pushUndoSnapshot(`تعديل البند #${index + 1} (${field})`);
    const updated = [...currentItems];
    const item = { ...updated[index] };

    if (field === 'description') item.description = String(val);
    if (field === 'unit') item.unit = String(val);
    if (field === 'quantity') item.quantity = parseFloat(String(val)) || 0;
    if (field === 'unitPrice') item.unitPrice = parseFloat(String(val)) || 0;

    item.unitPriceInWords =
      item.unitPrice > 0 ? tafqeet(item.unitPrice) : 'صفر';
    item.totalPrice = Number((item.quantity * item.unitPrice).toFixed(2));
    item.totalPriceInWords =
      item.totalPrice > 0 ? tafqeet(item.totalPrice) : 'صفر';
    item.vat = Number((item.totalPrice * 0.15).toFixed(2));
    item.totalWithVat = Number((item.totalPrice + item.vat).toFixed(2));
    item.totalWithVatInWords =
      item.totalWithVat > 0 ? tafqeet(item.totalWithVat) : 'صفر';

    updated[index] = item;
    setCurrentItems(updated);

    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
  };

  const handleAddNewItem = () => {
    pushUndoSnapshot('إضافة بند جديد إلى جدول الكميات');
    const nextNum = currentItems.length + 1;
    const newItem = RealBoqEngine.calculateItem(
      nextNum,
      'بند توريد جديد',
      'عدد',
      1,
      1000
    );
    const updated = [...currentItems, newItem];
    setCurrentItems(updated);

    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
    addNotification({
      title: 'إضافة بند ومزامنة القسم الآخر',
      message: `تمت إضافة البند #${nextNum} وانعكاسه فوراً في كافة أقسام كاس.`,
      type: 'success',
    });
  };

  const handleDuplicateItem = (index: number) => {
    const target = currentItems[index];
    if (!target) return;
    pushUndoSnapshot(`نسخ البند #${index + 1}`);
    const cloned: BOQItem = {
      ...target,
      id: `item-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: `${target.description} (نسخة)`,
    };
    const updated = [
      ...currentItems.slice(0, index + 1),
      cloned,
      ...currentItems.slice(index + 1),
    ].map((it, idx) => ({ ...it, itemNumber: idx + 1 }));
    setCurrentItems(updated);

    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
  };

  const handleDeleteItem = (index: number) => {
    if (currentItems.length <= 1) return;
    pushUndoSnapshot(`حذف البند #${index + 1}`);
    const updated = currentItems
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, itemNumber: idx + 1 }));
    setCurrentItems(updated);

    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
  };

  const handleRemoveZeroItems = () => {
    const nonZero = currentItems.filter(
      (it) => it.quantity > 0 && it.unitPrice > 0
    );
    if (nonZero.length === currentItems.length || nonZero.length === 0) return;
    pushUndoSnapshot('حذف البنود الصفرية');
    const reindexed = nonZero.map((it, idx) => ({
      ...it,
      itemNumber: idx + 1,
    }));
    setCurrentItems(reindexed);
    const totals = RealBoqEngine.recalculateTender(reindexed);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: reindexed,
      itemsCount: reindexed.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
  };

  const handleQuickPriceAdjust = (mode: number | 'round') => {
    pushUndoSnapshot(
      mode === 'round'
        ? 'تقريب أسعار البنود'
        : `تعديل الأسعار بنسبة (${mode}%)`
    );
    const updated = currentItems.map((it, idx) => {
      const nextPrice =
        mode === 'round'
          ? Math.round(it.unitPrice)
          : Number((it.unitPrice * (1 + mode / 100)).toFixed(2));
      return RealBoqEngine.calculateItem(
        idx + 1,
        it.description,
        it.unit,
        it.quantity,
        Math.max(0, nextPrice),
        it.id
      );
    });
    setCurrentItems(updated);
    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
  };

  const handleCreateNewSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetForm.title.trim()) return;
    pushUndoSnapshot(`إنشاء ورقة جدول جديدة: ${newSheetForm.title}`);

    const chosenEntity =
      newSheetForm.entityName.trim() ||
      'مؤسسة خالد عبدالعزيز السليم للتجارة';
    kasNovemberWorkbooksService.addEstablishmentByName(chosenEntity);
    const nextEsts = kasNovemberWorkbooksService.getEstablishments();
    setEstablishments([...nextEsts]);

    const firstItem = RealBoqEngine.calculateItem(
      1,
      'بند التوريد والتجهيز الرئيسي',
      'عدد',
      1,
      25000
    );
    const totals = RealBoqEngine.recalculateTender([firstItem]);
    const targetWbMeta =
      workbooksMeta.find((w) => w.id === newSheetForm.workbookId) ||
      workbooksMeta[0];

    const newTender: TenderRecord = {
      id: `KAS-SHEET-${Date.now()}`,
      workbookId: newSheetForm.workbookId,
      workbookLabel: targetWbMeta?.label || 'شهر 11 — نسخة 1',
      sourceFileName: targetWbMeta?.fileName || 'شهر11 نسخة 1.xlsm',
      sheetName:
        newSheetForm.sheetName.trim() || `الجدول (${tendersList.length + 1})`,
      referenceNumber: newSheetForm.referenceNumber.trim(),
      title: newSheetForm.title.trim(),
      entityName: chosenEntity,
      clientName: newSheetForm.clientName.trim(),
      category: 'توريدات حكومية وتجهيزات',
      status: 'مقدمة ومسعرة',
      submissionDate: new Date().toISOString().split('T')[0],
      supplyDuration: newSheetForm.supplyDuration,
      validityDuration: newSheetForm.validityDuration,
      commitmentDays: 180,
      itemsCount: 1,
      ...totals,
      items: [firstItem],
    };

    const nextList = [newTender, ...tendersList];
    setTendersList(nextList);
    setSelectedTender(newTender);
    setCurrentItems(newTender.items);
    setShowNewSheetModal(false);
    persistAndBroadcast(nextList, nextEsts, newTender.id);

    addNotification({
      title: 'تمت إضافة الورقة ومزامنتها في القسمين',
      message: `تم إنشاء "${newTender.sheetName}" برقم مرجعي (${newTender.referenceNumber}) وانعكاسها فوراً في القسم الآخر.`,
      type: 'success',
    });
  };

  const handleDuplicateCurrentSheet = () => {
    pushUndoSnapshot(`نسخ الورقة: ${selectedTender.sheetName}`);
    const cloned: TenderRecord = {
      ...selectedTender,
      id: `KAS-CLONE-${Date.now()}`,
      sheetName: `${selectedTender.sheetName || 'الجدول'} (نسخة)`,
      referenceNumber: `2511${Math.floor(10000000 + Math.random() * 90000000)}`,
      title: `${selectedTender.title} (نسخة)`,
      items: selectedTender.items.map((it, idx) => ({
        ...it,
        id: `item-clone-${idx}-${Date.now()}`,
      })),
    };
    const nextList = [cloned, ...tendersList];
    setTendersList(nextList);
    setSelectedTender(cloned);
    setCurrentItems(cloned.items);
    persistAndBroadcast(nextList, establishments, cloned.id);
    addNotification({
      title: 'تم نسخ الورقة ومزامنة القسم الآخر',
      message: `تم إنشاء نسخة مطابقة "${cloned.sheetName}" في كلا القسمين.`,
      type: 'success',
    });
  };

  const handleDeleteCurrentSheet = () => {
    if (tendersList.length <= 1) return;
    pushUndoSnapshot(`حذف الورقة: ${selectedTender.sheetName}`);
    const nextList = tendersList.filter((t) => t.id !== selectedTender.id);
    const nextSelected = nextList[0];
    setTendersList(nextList);
    setSelectedTender(nextSelected);
    setCurrentItems(nextSelected.items || []);
    persistAndBroadcast(nextList, establishments, nextSelected.id);
    addNotification({
      title: 'تم حذف الورقة ومزامنة القسم الآخر',
      message: 'تم حذف الورقة بنجاح (يمكنك استعادتها بزر التراجع Undo).',
      type: 'info',
    });
  };

  const handleUploadExcelWorkbook = async (file: File) => {
    try {
      const arrayBuf = await file.arrayBuffer();
      const parsed = RealBoqEngine.parseKasMultiSheetWorkbook(
        arrayBuf,
        file.name
      );
      if (parsed.tenders.length === 0 && parsed.establishments.length === 0) {
        addNotification({
          title: 'تنبيه تحويل ملف الإكسيل',
          message:
            parsed.errors[0] ||
            'لم يتم العثور على جداول كميات صالحة داخل الملف.',
          type: 'warning',
        });
        return;
      }

      pushUndoSnapshot(`رفع وتحويل مصنف: ${file.name}`);
      const nextEsts =
        parsed.establishments.length > 0
          ? parsed.establishments
          : establishments;
      if (parsed.establishments.length > 0) {
        setEstablishments(nextEsts);
      }

      if (parsed.tenders.length > 0) {
        const wbId = parsed.tenders[0].workbookId || `wb-${Date.now()}`;
        const wbLabel =
          parsed.tenders[0].workbookLabel || file.name.replace(/\.[^.]+$/, '');
        const nextWbMeta = [
          {
            id: wbId,
            label: wbLabel,
            fileName: file.name,
            sheetsCount: parsed.tenders.length,
          },
          ...workbooksMeta.filter((w) => w.id !== wbId),
        ];
        setWorkbooksMeta(nextWbMeta);
        kasNovemberWorkbooksService.setWorkbooksMeta(nextWbMeta);

        const nextTenders = [...parsed.tenders, ...tendersList];
        setTendersList(nextTenders);
        setSelectedTender(parsed.tenders[0]);
        setCurrentItems(parsed.tenders[0].items);
        setActiveWorkbookFilter(wbId);
        persistAndBroadcast(nextTenders, nextEsts, parsed.tenders[0].id);
      }

      addNotification({
        title: 'تم استيراد المصنف ومزامنة القسمين',
        message: `تم استيراد (${parsed.tenders.length}) ورقة من "${file.name}" وانعكست في كافة أقسام كاس.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'خطأ في قراءة ملف الإكسيل',
        message: err?.message || 'تعذر تحويل ملف الإكسيل.',
        type: 'error',
      });
    }
  };

  const handleResetDefaults = () => {
    pushUndoSnapshot('استعادة البيانات الأصلية لمصنفات شهر 11');
    const defaults = kasNovemberWorkbooksService.getDefaultSeedSnapshot();
    setEstablishments(defaults.establishments);
    setTendersList(defaults.tenders);
    setSelectedTender(defaults.tenders[0]);
    setCurrentItems(defaults.tenders[0].items);
    setActiveWorkbookFilter('all');
    setActiveEstablishmentFilter('all');
    setSheetSearchQuery('');
    persistAndBroadcast(
      defaults.tenders,
      defaults.establishments,
      defaults.tenders[0].id
    );
    void kasNovemberWorkbooksService.ensureFullWorkbooksLoaded();
    addNotification({
      title: 'تمت استعادة الأصل ومزامنة القسمين',
      message: 'تمت استعادة مصنفات شهر 11 (النسخ 1..4) وجدول المؤسسات.',
      type: 'info',
    });
  };

  const handleShareEstablishments = (channel: 'email' | 'whatsapp') => {
    const title = 'جدول متابعة مؤسسات وشركات كاس للمنافسات (المؤسسات)';
    const pdfName = buildExecutivePdfFileName(title);
    const payload = {
      title,
      entityCode: 'KAS' as const,
      moduleName: 'kas_establishments_tracker',
      summaryLines: [
        {
          label: 'عدد المؤسسات والكيانات',
          value: `${establishments.length} مؤسسات`,
        },
        {
          label: 'إجمالي الكراسات المرتبطة',
          value: `${tendersList.length} كراسة منافسة`,
        },
      ],
      bodyText: establishments
        .map(
          (e, i) =>
            `${i + 1}. ${e.name} | انتهاء اليوم: ${e.endingToday || '-'} | انتهاء بعد اليوم: ${e.endingAfterToday || '-'} | الإجمالي: ${(e.endingToday || 0) + (e.endingAfterToday || 0) || '-'}`
        )
        .join('\n'),
      attachmentFileName: pdfName,
      attachmentFilePromise: generateExecutivePdfArtifact(
        'kas_establishments_tracker',
        establishments,
        title
      ).then((a) => a?.file ?? null),
    };
    if (channel === 'whatsapp') shareViaWhatsApp(payload);
    else shareViaEmail(payload);
  };

  const handleShareActiveBoq = (channel: 'email' | 'whatsapp') => {
    const t = selectedTender;
    const docTitle = `جدول الكميات والأسعار لمنافسة: ${t.title} (${t.referenceNumber})`;
    const pdfName = buildExecutivePdfFileName(docTitle);
    const payload = {
      title: docTitle,
      entityCode: 'KAS' as const,
      customCompanyNameAr: t.entityName,
      moduleName: 'kas_boq_items',
      summaryLines: [
        { label: 'اسم المؤسسة', value: t.entityName },
        { label: 'الرقم المرجعي', value: t.referenceNumber },
        { label: 'عنوان المنافسة', value: t.title },
        {
          label: 'الإجمالي شامل الضريبة',
          value: `\u200E\u20C1 ${t.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${t.grandTotalInWords})`,
        },
      ],
      bodyText: currentItems
        .map(
          (it, idx) =>
            `• بند (${idx + 1}): ${it.description} | الوحدة: ${it.unit} | الكمية: ${it.quantity} | سعر الوحدة: \u200E\u20C1 ${it.unitPrice.toFixed(2)} | شامل الضريبة: \u200E\u20C1 ${it.totalWithVat.toFixed(2)}`
        )
        .join('\n'),
      attachmentFileName: pdfName,
      attachmentFilePromise: generateExecutivePdfArtifact(
        'kas_boq_items',
        currentItems,
        docTitle,
        {
          entityCode: 'KAS',
          customCompanyNameAr: t.entityName,
        }
      ).then((a) => a?.file ?? null),
    };
    if (channel === 'whatsapp') shareViaWhatsApp(payload);
    else shareViaEmail(payload);
  };

  const handlePasteItemsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    pushUndoSnapshot('لصق بنود من الحافظة');
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedItems: BOQItem[] = [];
    lines.forEach((line, idx) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const desc = (parts[0] || `بند مستورد ${idx + 1}`).trim();
      const unit = (parts[1] || 'عدد').trim();
      const qty = parseFloat(parts[2] || '1') || 1;
      const price = parseFloat(parts[3] || '0') || 0;
      parsedItems.push(
        RealBoqEngine.calculateItem(
          currentItems.length + idx + 1,
          desc,
          unit,
          qty,
          price
        )
      );
    });
    if (parsedItems.length === 0) return;
    const updated = [...currentItems, ...parsedItems].map((it, i) => ({
      ...it,
      itemNumber: i + 1,
    }));
    setCurrentItems(updated);
    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) =>
      t.id === updatedTender.id ? updatedTender : t
    );
    setTendersList(nextList);
    persistAndBroadcast(nextList);
    setPasteText('');
    setShowPasteItemsModal(false);
  };

  const handleApplyMarginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(marginPct);
    if (isNaN(pct)) return;
    handleQuickPriceAdjust(pct);
    setShowMarginModal(false);
  };

  return (
    <div
      className="space-y-5"
      dir="rtl"
      data-slot="kas-exact-replica-standalone-page"
    >
      {/* Independent Section Header Banner */}
      <div className="rounded-2xl bg-[#141414] text-white p-5 border border-[#262626] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border border-black"
              style={{ backgroundColor: '#00CC00', color: '#000000' }}
            >
              قسم مستقل داخل منظومة كاس (KAS-XLSM)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#262626] text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>مرتبط لحظياً مع قسم المنافسات وجداول الكميات (BOQ)</span>
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white m-0">
            قسم جداول ومصنفات كاس المطابقة للأصل بالملي (شهر 11 — النسخ 1..4 وورقة المؤسسات)
          </h1>
          <p className="text-xs text-[#adadad] m-0">
            نسخة مطابقة 100% لملفات إكسيل كاس (شهر11 نسخة 1..4.xlsm وورقة المؤسسات) بالألوان والدمج والمعادلات وماكرو O3/O4 — أي تعديل أو إضافة أو حذف هنا يسمع تلقائياً في القسم الآخر والعكس.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowNewSheetModal(true)}
            className="px-3.5 py-2 rounded-xl font-extrabold text-xs border border-black flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: '#00CC00', color: '#000000' }}
          >
            <Plus className="w-4 h-4" />
            <span>+ إنشاء ورقة جدول جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteItemsModal(true)}
            className="px-3 py-2 rounded-xl bg-[#262626] hover:bg-[#363636] text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>لصق بنود</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMarginModal(true)}
            className="px-3 py-2 rounded-xl bg-[#262626] hover:bg-[#363636] text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>هامش الربح</span>
          </button>

          <button
            type="button"
            data-slot="goto-paired-boq-page-btn"
            onClick={() =>
              setGlobalTab('tenders-boq', 'منافسات اعتماد وجداول الكميات (BOQ)')
            }
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#f3f3f3] text-[#141414] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>فتح القسم الآخر (منافسات وجداول BOQ)</span>
          </button>
        </div>
      </div>

      {/* Main Exact Replica Workbooks & Establishments Component */}
      {selectedTender && (
        <KasExactReplicaWorkbooksSection
          establishments={establishments}
          tendersList={tendersList}
          selectedTender={selectedTender}
          currentItems={currentItems}
          workbooksMeta={workbooksMeta}
          activeWorkbookFilter={activeWorkbookFilter}
          onWorkbookFilterChange={setActiveWorkbookFilter}
          activeEstablishmentFilter={activeEstablishmentFilter}
          onEstablishmentFilterChange={setActiveEstablishmentFilter}
          sheetSearchQuery={sheetSearchQuery}
          onSheetSearchQueryChange={setSheetSearchQuery}
          onSelectTender={handleSelectTender}
          onUpdateEstablishment={handleUpdateEstablishment}
          onAddEstablishment={handleAddEstablishment}
          onDuplicateEstablishment={handleDuplicateEstablishment}
          onDeleteEstablishment={handleDeleteEstablishment}
          onSyncEstablishmentsClosingCounts={
            handleSyncEstablishmentsClosingCounts
          }
          onInlineTenderHeaderChange={handleInlineTenderHeaderChange}
          onSaveCurrentEntityToEstablishments={
            handleSaveCurrentEntityToEstablishments
          }
          onItemChange={handleItemChange}
          onAddNewItem={handleAddNewItem}
          onDuplicateItem={handleDuplicateItem}
          onDeleteItem={handleDeleteItem}
          onRemoveZeroItems={handleRemoveZeroItems}
          onQuickPriceAdjust={handleQuickPriceAdjust}
          onCreateNewSheet={() => setShowNewSheetModal(true)}
          onDuplicateCurrentSheet={handleDuplicateCurrentSheet}
          onDeleteCurrentSheet={handleDeleteCurrentSheet}
          onUploadExcelWorkbook={handleUploadExcelWorkbook}
          onShareEstablishments={handleShareEstablishments}
          onShareActiveBoq={handleShareActiveBoq}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          undoCount={undoStack.length}
          redoCount={redoStack.length}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onResetDefaults={handleResetDefaults}
          onSwitchToOtherSection={() =>
            setGlobalTab('tenders-boq', 'منافسات اعتماد وجداول الكميات (BOQ)')
          }
          otherSectionLabel="قسم منافسات اعتماد وجداول الكميات (BOQ)"
          lastSyncTimestamp={lastSyncTimestamp}
        />
      )}

      {/* Modal 1: Create New Sheet */}
      {showNewSheetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-white border-2 border-black rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-black" />
                <h3 className="text-sm font-extrabold text-black m-0">
                  إضافة ورقة جدول جديدة (تسمع فوراً في القسمين)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSheetModal(false)}
                className="p-1 rounded-lg hover:bg-[#f3f3f3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSheetSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    النسخة (المصنف)
                  </label>
                  <select
                    value={newSheetForm.workbookId}
                    onChange={(e) =>
                      setNewSheetForm((f) => ({
                        ...f,
                        workbookId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#f3f3f3] border border-black text-xs font-bold text-black"
                  >
                    {workbooksMeta.map((wb) => (
                      <option key={wb.id} value={wb.id}>
                        {wb.fileName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    اسم الورقة (مثال: الجدول 86)
                  </label>
                  <input
                    type="text"
                    value={newSheetForm.sheetName}
                    onChange={(e) =>
                      setNewSheetForm((f) => ({
                        ...f,
                        sheetName: e.target.value,
                      }))
                    }
                    placeholder={`الجدول (${tendersList.length + 1})`}
                    className="w-full px-3 py-2 rounded-xl bg-[#f3f3f3] border border-black text-xs font-bold text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    اسم المؤسسة (الخلية E3)
                  </label>
                  <input
                    type="text"
                    list="exact-modal-est-list"
                    value={newSheetForm.entityName}
                    onChange={(e) =>
                      setNewSheetForm((f) => ({
                        ...f,
                        entityName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#f3f3f3] border border-black text-xs font-bold text-black"
                    required
                  />
                  <datalist id="exact-modal-est-list">
                    {establishments.map((est) => (
                      <option key={est.id} value={est.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    الرقم المرجعي (الخلية M3)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newSheetForm.referenceNumber}
                    onChange={(e) =>
                      setNewSheetForm((f) => ({
                        ...f,
                        referenceNumber: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#f3f3f3] border border-black text-xs font-mono font-bold text-black"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  عنوان المنافسة (الخلية E4)
                </label>
                <input
                  type="text"
                  value={newSheetForm.title}
                  onChange={(e) =>
                    setNewSheetForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="أدخل مسمى المنافسة..."
                  className="w-full px-3 py-2 rounded-xl bg-[#f3f3f3] border border-black text-xs font-bold text-black"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSheetModal(false)}
                  className="px-4 py-2 rounded-xl border border-black text-xs font-bold text-black cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-black text-xs font-extrabold cursor-pointer"
                  style={{ backgroundColor: '#00CC00', color: '#000000' }}
                >
                  إضافة الورقة ومزامنة القسمين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Paste Items */}
      {showPasteItemsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-white border-2 border-black rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="text-sm font-extrabold text-black m-0">
                لصق بنود مباشرة من إكسيل (الوصف [Tab] الوحدة [Tab] الكمية [Tab] السعر)
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteItemsModal(false)}
                className="p-1 rounded-lg hover:bg-[#f3f3f3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePasteItemsSubmit} className="space-y-3">
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="الصق صفوف إكسيل هنا..."
                className="w-full p-3 rounded-xl bg-[#f3f3f3] border border-black text-xs font-mono text-black"
                required
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteItemsModal(false)}
                  className="px-4 py-2 rounded-xl border border-black text-xs font-bold text-black cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-black text-xs font-extrabold cursor-pointer"
                  style={{ backgroundColor: '#00CC00', color: '#000000' }}
                >
                  إدراج البنود ومزامنة القسمين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Margin Adjustment */}
      {showMarginModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-white border-2 border-black rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="text-sm font-extrabold text-black m-0">
                تطبيق نسبة هامش ربح / تعديل على كافة البنود (%)
              </h3>
              <button
                type="button"
                onClick={() => setShowMarginModal(false)}
                className="p-1 rounded-lg hover:bg-[#f3f3f3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleApplyMarginSubmit} className="space-y-3">
              <input
                type="number"
                step="0.5"
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#f3f3f3] border border-black text-sm font-mono font-bold text-black text-center"
                required
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarginModal(false)}
                  className="px-4 py-2 rounded-xl border border-black text-xs font-bold text-black cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-black text-xs font-extrabold cursor-pointer"
                  style={{ backgroundColor: '#00CC00', color: '#000000' }}
                >
                  تطبيق النسبة ومزامنة القسمين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default KasExactReplicaTablesPage;
