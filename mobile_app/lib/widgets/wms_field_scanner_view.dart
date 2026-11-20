import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/erp_tokens.dart';

class WmsFieldScanLogEntry {
  final String id;
  final String mode;
  final String sku;
  final String warehouseId;
  final double qty;
  final String binCode;
  final String lotNumber;
  final String expiryDate;
  final bool queuedOffline;
  final String timestamp;

  const WmsFieldScanLogEntry({
    required this.id,
    required this.mode,
    required this.sku,
    required this.warehouseId,
    required this.qty,
    required this.binCode,
    required this.lotNumber,
    required this.expiryDate,
    required this.queuedOffline,
    required this.timestamp,
  });
}

/// Mobile PDA / Hardware Barcode Field Scanner & Offline Queue View
/// Synchronized with KAS Enterprise WMS v2 (Mobbin Monochrome + SAMA \u20C1)
class WmsFieldScannerView extends StatefulWidget {
  final String companyId;
  final bool offlineMode;
  final int pendingOfflineCount;
  final void Function(String actionType, String description) onEnqueueOffline;
  final void Function(String actionType, String description) onCommittedOnline;
  final VoidCallback onSyncNow;

  const WmsFieldScannerView({
    super.key,
    required this.companyId,
    required this.offlineMode,
    required this.pendingOfflineCount,
    required this.onEnqueueOffline,
    required this.onCommittedOnline,
    required this.onSyncNow,
  });

  @override
  State<WmsFieldScannerView> createState() => _WmsFieldScannerViewState();
}

class _WmsFieldScannerViewState extends State<WmsFieldScannerView> {
  static const List<Map<String, String>> _modes = [
    {'id': 'GRN', 'label': 'استلام وارد (GRN)'},
    {'id': 'GIN', 'label': 'صرف ميداني (GIN)'},
    {'id': 'CYCLE_COUNT', 'label': 'جرد أعمى'},
    {'id': 'IN_TRANSIT', 'label': 'تأكيد استلام تحويل'},
  ];

  static const List<Map<String, String>> _warehouses = [
    {'id': 'WH-MAIN', 'label': 'WH-MAIN • المستودع المركزي'},
    {'id': 'WH-NEW', 'label': 'WH-NEW • المستودع الجديد'},
    {'id': 'WH-SHELTER', 'label': 'WH-SHELTER • مستودع سكن العاملات'},
    {'id': 'WH-OFFICE', 'label': 'WH-OFFICE • مستودع المكاتب'},
  ];

  static const List<Map<String, String>> _quickSkus = [
    {'sku': 'KAS-ELC-001', 'label': 'KAS-ELC-001 • مفتاح مكيف'},
    {'sku': 'KAS-PLB-001', 'label': 'KAS-PLB-001 • شطاف مياه'},
    {'sku': 'KAS-IT-001', 'label': 'KAS-IT-001 • Nikon Z8 / تقنية'},
    {'sku': 'KAS-CON-001', 'label': 'KAS-CON-001 • حجارة / مستهلكات'},
  ];

  final TextEditingController _barcodeCtrl = TextEditingController();
  final TextEditingController _binCtrl = TextEditingController(text: 'Z1-R1-B1');
  final TextEditingController _lotCtrl = TextEditingController();
  final TextEditingController _expiryCtrl = TextEditingController();
  final FocusNode _barcodeFocus = FocusNode();

  String _selectedMode = 'GRN';
  String _selectedWarehouse = 'WH-MAIN';
  int _qty = 1;
  final List<WmsFieldScanLogEntry> _recentScans = [];

  @override
  void dispose() {
    _barcodeCtrl.dispose();
    _binCtrl.dispose();
    _lotCtrl.dispose();
    _expiryCtrl.dispose();
    _barcodeFocus.dispose();
    super.dispose();
  }

  void _submitScan([String? overrideBarcode]) {
    final code = (overrideBarcode ?? _barcodeCtrl.text).trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: ErpTokens.primary,
          behavior: SnackBarBehavior.floating,
          content: Text('امسح الباركود أو أدخل رمز الصنف (SKU) أولاً.', style: TextStyle(color: Colors.white)),
        ),
      );
      return;
    }

    HapticFeedback.lightImpact();
    final nowTime = TimeOfDay.now();
    final ts = '${nowTime.hour.toString().padLeft(2, '0')}:${nowTime.minute.toString().padLeft(2, '0')}';
    final binCode = _binCtrl.text.trim().isEmpty ? 'Z1-R1-B1' : _binCtrl.text.trim();
    final lotNo = _lotCtrl.text.trim();
    final expDate = _expiryCtrl.text.trim();

    final entry = WmsFieldScanLogEntry(
      id: 'SCN-${DateTime.now().millisecondsSinceEpoch % 100000}',
      mode: _selectedMode,
      sku: code.toUpperCase(),
      warehouseId: _selectedWarehouse,
      qty: _qty.toDouble(),
      binCode: binCode,
      lotNumber: lotNo,
      expiryDate: expDate,
      queuedOffline: widget.offlineMode,
      timestamp: ts,
    );

    final desc =
        '[$_selectedMode] ${entry.sku} × $_qty — $_selectedWarehouse ($binCode)${lotNo.isNotEmpty ? ' • Lot: $lotNo' : ''} (${ErpTokens.saudiRiyalSymbol} موثّق)';

    setState(() {
      _recentScans.insert(0, entry);
      if (_recentScans.length > 25) _recentScans.removeLast();
      _barcodeCtrl.clear();
    });

    if (widget.offlineMode) {
      widget.onEnqueueOffline('WMS_$_selectedMode', desc);
    } else {
      widget.onCommittedOnline('WMS_$_selectedMode', desc);
    }

    _barcodeFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Monochrome Hero Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: ErpTokens.cardFeatureCinematicDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'محطة الجرد والماسح الميداني (${widget.companyId})',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: widget.offlineMode ? const Color(0xFF404040) : Colors.white,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    ),
                    child: Text(
                      widget.offlineMode
                          ? 'أوفلاين (${widget.pendingOfflineCount} معلق)'
                          : 'سحابي متصل (${ErpTokens.saudiRiyalSymbol})',
                      style: TextStyle(
                        color: widget.offlineMode ? Colors.white : ErpTokens.primary,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'استقبال فوري من أجهزة USB/Bluetooth HID أو الباركود السريع • دعم الجرد الأعمى وطابور الأوفلاين',
                style: TextStyle(color: Color(0xFFB3B3B3), fontSize: 11.5),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: widget.onSyncNow,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.cloud_sync_rounded, size: 16, color: ErpTokens.primary),
                            const SizedBox(width: 6),
                            Text(
                              'مزامنة سحابية فورية (${widget.pendingOfflineCount})',
                              style: const TextStyle(
                                color: ErpTokens.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Operational Mode Pills
        Container(
          padding: const EdgeInsets.all(14),
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'نوع الحركة المخزنية الميدانية',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _modes.map((m) {
                  final active = _selectedMode == m['id'];
                  return ChoiceChip(
                    label: Text(m['label']!),
                    selected: active,
                    selectedColor: ErpTokens.primary,
                    backgroundColor: ErpTokens.surfaceLow,
                    labelStyle: TextStyle(
                      color: active ? Colors.white : ErpTokens.ink,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                    ),
                    shape: const StadiumBorder(side: BorderSide(color: ErpTokens.hairlineLight)),
                    onSelected: (_) => setState(() => _selectedMode = m['id']!),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),

              // Hardware PDA Scanner TextField
              TextField(
                controller: _barcodeCtrl,
                focusNode: _barcodeFocus,
                textInputAction: TextInputAction.send,
                onSubmitted: (val) => _submitScan(val),
                decoration: InputDecoration(
                  labelText: 'امسح الباركود / أدخل SKU (PDA / USB-C / Bluetooth HID)',
                  hintText: 'مثال: KAS-ELC-001 أو رقم سيريال...',
                  filled: true,
                  fillColor: ErpTokens.surfaceLow,
                  prefixIcon: const Icon(Icons.qr_code_scanner_rounded, color: ErpTokens.primary),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send_rounded, color: ErpTokens.primary),
                    onPressed: () => _submitScan(),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Quick SKUs
              const Text(
                'اختصار مسح أصناف سريعة (KAS):',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ErpTokens.shade50),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _quickSkus.map((q) {
                  return InkWell(
                    onTap: () {
                      _barcodeCtrl.text = q['sku']!;
                      _submitScan(q['sku']);
                    },
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: ErpTokens.surfaceLow,
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        border: Border.all(color: ErpTokens.hairlineLight),
                      ),
                      child: Text(
                        q['label']!,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),

              // Warehouse Dropdown + Qty Stepper
              DropdownButtonFormField<String>(
                initialValue: _selectedWarehouse,
                decoration: InputDecoration(
                  labelText: 'المستودع المستهدف',
                  filled: true,
                  fillColor: ErpTokens.surfaceLow,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                ),
                items: _warehouses
                    .map((w) => DropdownMenuItem<String>(
                          value: w['id'],
                          child: Text(w['label']!, style: const TextStyle(fontSize: 12)),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedWarehouse = val);
                },
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _binCtrl,
                      decoration: InputDecoration(
                        labelText: 'الرف / الموقع (Bin)',
                        filled: true,
                        fillColor: ErpTokens.surfaceLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: ErpTokens.surfaceLow,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      border: Border.all(color: ErpTokens.hairlineLight),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 20, color: ErpTokens.ink),
                          onPressed: () => setState(() => _qty = _qty > 1 ? _qty - 1 : 1),
                        ),
                        Text(
                          '$_qty',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, size: 20, color: ErpTokens.ink),
                          onPressed: () => setState(() => _qty += 1),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _lotCtrl,
                      decoration: InputDecoration(
                        labelText: 'رقم التشغيلة Lot (اختياري)',
                        filled: true,
                        fillColor: ErpTokens.surfaceLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _expiryCtrl,
                      decoration: InputDecoration(
                        labelText: 'تاريخ الانتهاء YYYY-MM-DD',
                        filled: true,
                        fillColor: ErpTokens.surfaceLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ErpTokens.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ErpTokens.radiusPill)),
                  ),
                  onPressed: () => _submitScan(),
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                  label: Text(
                    widget.offlineMode ? 'حفظ في طابور الأوفلاين الميداني' : 'تنفيذ وقيد الحركة المخزنية',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 3. Recent Field Scans Log
        Container(
          padding: const EdgeInsets.all(14),
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'سجل مسح الميدان الأخير',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                  ),
                  Text(
                    '${_recentScans.length} حركة',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: ErpTokens.shade50),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_recentScans.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Center(
                    child: Text(
                      'لم يتم مسح أي باركود في هذه الجلسة بعد — استخدم الماسح أو اختر أحد الاختصارات أعلاه.',
                      style: TextStyle(fontSize: 11.5, color: ErpTokens.shade50),
                    ),
                  ),
                )
              else
                ..._recentScans.map((e) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: ErpTokens.surfaceLow,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: ErpTokens.hairlineLight),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          ),
                          child: Text(
                            e.mode,
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${e.sku} • الكمية: ${e.qty.toStringAsFixed(0)} • ${e.warehouseId}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                              ),
                              Text(
                                'الرف: ${e.binCode}${e.lotNumber.isNotEmpty ? ' • تشغيلة: ${e.lotNumber}' : ''} • ${e.timestamp}',
                                style: const TextStyle(fontSize: 10.5, color: ErpTokens.shade50),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            border: Border.all(color: ErpTokens.hairlineLight),
                          ),
                          child: Text(
                            e.queuedOffline ? 'بانتظار الشبكة' : 'مقيد',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }
}
