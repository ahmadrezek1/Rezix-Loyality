# Privacy by Design – v0.5

Rezix v0.5 يطبق طبقة تقنية أولى للخصوصية:

1. Data minimization: التسجيل يطلب الاسم ورقم الهاتف فقط للوظيفة الأساسية.
2. Purpose separation: موافقة التسويق مستقلة عن تشغيل Treuekarte.
3. Consent evidence: كل موافقة تسجل بإصدار السياسة ووقت الحدث.
4. Data access: العميل يستطيع تنزيل نسخة machine-readable.
5. Erasure workflow: الطلب لا ينفذ بصمت؛ يظهر للـManager ثم يتم anonymisieren بعد المراجعة.
6. Tenant isolation: Privacy requests مرتبطة بـ business_id.
7. Auditability: التصدير والحذف وقرارات المعالجة تدخل Audit Log.
8. No raw IP storage for consent evidence: تحفظ HMAC fingerprint فقط.

## قبل Production التجاري

- حدد Retention periods رسميًا.
- أضف AVV/DPA للصالونات.
- أكمل Subprocessor list.
- راجع Third-country transfers/SCCs حسب إعدادات Vercel/Supabase.
- أضف workflow لتصحيح البيانات وwithdraw marketing consent.
- نفذ مراجعة قانونية للنصوص.
