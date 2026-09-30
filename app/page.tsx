"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type CalculationType = "standard" | "lane";
type DocumentType = "invoice" | "estimate" | "delivery";

const documentConfig = {
  invoice: {
    title: "請求書",
    printTitle: "請 求 書",
    dateLabel: "請求日",
    numberLabel: "請求番号",
    subjectLabel: "請求件名",
    binderLabel: "請求書バインダー",
    firstMetaLabel: "受渡期日",
    firstMetaPlaceholder: "例：2026年9月28日",
    secondMetaLabel: "受渡場所",
    secondMetaPlaceholder: "例：会場",
    thirdMetaLabel: "支払条件",
    thirdMetaPlaceholder: "例：月末締め翌月末払い",
    showPayment: true,
  },
  estimate: {
    title: "見積書",
    printTitle: "見 積 書",
    dateLabel: "見積日",
    numberLabel: "見積番号",
    subjectLabel: "見積件名",
    binderLabel: "見積書バインダー",
    firstMetaLabel: "有効期限",
    firstMetaPlaceholder: "例：発行日より30日",
    secondMetaLabel: "実施場所",
    secondMetaPlaceholder: "例：会場",
    thirdMetaLabel: "支払条件",
    thirdMetaPlaceholder: "例：月末締め翌月末払い",
    showPayment: false,
  },
  delivery: {
    title: "納品書",
    printTitle: "納 品 書",
    dateLabel: "納品日",
    numberLabel: "納品番号",
    subjectLabel: "納品件名",
    binderLabel: "納品書バインダー",
    firstMetaLabel: "実施日",
    firstMetaPlaceholder: "例：2026年9月28日",
    secondMetaLabel: "納品場所",
    secondMetaPlaceholder: "例：会場",
    thirdMetaLabel: "備考",
    thirdMetaPlaceholder: "必要な場合のみ入力",
    showPayment: false,
  },
} as const;

type LineItem = {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  lanes: number;
  unitPrice: number;
  calculationType: CalculationType;
};

type BinderDocument = {
  id: string;
  project_id: string;
  document_type: DocumentType;
  document_number: string | null;
  issue_date: string | null;
  subject: string | null;
  customer_name: string | null;
  first_meta: string | null;
  second_meta: string | null;
  third_meta: string | null;
  notes: string | null;
};

const itemPresets = [
  { name: "SPIXD 基本料金", unitPrice: 80000, unit: "日", calculationType: "lane" as CalculationType },
  { name: "WEBカスタマイズ", unitPrice: 20000, unit: "イベント", calculationType: "standard" as CalculationType },
  { name: "レシートカスタマイズ", unitPrice: 20000, unit: "イベント", calculationType: "standard" as CalculationType },
  { name: "フレーム制作", unitPrice: 20000, unit: "イベント", calculationType: "standard" as CalculationType },
  { name: "オペレーター費", unitPrice: 30000, unit: "日", calculationType: "lane" as CalculationType },
  { name: "カメラマン費", unitPrice: 40000, unit: "日", calculationType: "lane" as CalculationType },
  { name: "交通費", unitPrice: 0, unit: "式", calculationType: "standard" as CalculationType },
  { name: "搬入・テスト稼働費", unitPrice: 0, unit: "式", calculationType: "standard" as CalculationType },
  { name: "機材費", unitPrice: 0, unit: "日", calculationType: "lane" as CalculationType },
];

const unitOptions = ["日", "イベント", "式", "人", "名", "台", "会場", "レーン", "枚", "時間"];

function lineAmount(item: LineItem) {
  const multiplier = item.calculationType === "lane" ? item.lanes : 1;
  return item.quantity * multiplier * item.unitPrice;
}

function blankItem(): LineItem {
  return {
    id: Date.now() + Math.random(),
    name: "",
    description: "",
    quantity: 1,
    unit: "式",
    lanes: 1,
    unitPrice: 0,
    calculationType: "standard",
  };
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const config = documentConfig[documentType];
  const [customer, setCustomer] = useState("株式会社マイナビ");
  const [projectName, setProjectName] = useState("イベント運営費");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [subject, setSubject] = useState("イベント運営費");
  const [invoiceNo, setInvoiceNo] = useState("2026-001");
  const [issueDate, setIssueDate] = useState("2026-09-28");
  const [firstMeta, setFirstMeta] = useState("");
  const [secondMeta, setSecondMeta] = useState("");
  const [thirdMeta, setThirdMeta] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [binderDocuments, setBinderDocuments] = useState<BinderDocument[]>([]);
  const [binderLoading, setBinderLoading] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    {
      id: 1,
      name: "SPIXD 基本料金",
      description: "同日、東京・大阪の2会場にて実施",
      quantity: 1,
      unit: "日",
      lanes: 2,
      unitPrice: 80000,
      calculationType: "lane",
    },
    {
      id: 2,
      name: "WEBカスタマイズ",
      description: "HPへのリンク設置、ロゴ・タイトル反映",
      quantity: 1,
      unit: "イベント",
      lanes: 1,
      unitPrice: 20000,
      calculationType: "standard",
    },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError("メールアドレスまたはパスワードを確認してください。");
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const loadBinderDocuments = async (type: DocumentType = documentType) => {
    setBinderLoading(true);

    const { data, error } = await supabase
      .from("documents")
      .select("id, project_id, document_type, document_number, issue_date, subject, customer_name, first_meta, second_meta, third_meta, notes")
      .eq("document_type", type)
      .order("issue_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadBinderDocuments failed", error);
      setBinderDocuments([]);
    } else {
      setBinderDocuments((data ?? []) as BinderDocument[]);
    }

    setBinderLoading(false);
  };

  const loadDocument = async (document: BinderDocument) => {
    setDocumentId(document.id);
    setProjectId(document.project_id);
    setCustomer(document.customer_name ?? "");
    setSubject(document.subject ?? "");
    setInvoiceNo(document.document_number ?? "");
    setIssueDate(document.issue_date ?? "");
    setFirstMeta(document.first_meta ?? "");
    setSecondMeta(document.second_meta ?? "");
    setThirdMeta(document.third_meta ?? "");
    setNotes(document.notes ?? "");
    setSaveState("idle");
    setSaveError("");

    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("name, event_date, venue")
      .eq("id", document.project_id)
      .single();

    if (projectError) {
      console.error("loadDocument project failed", projectError);
    } else if (projectRow) {
      setProjectName(projectRow.name ?? "");
      setEventDate(projectRow.event_date ?? "");
      setVenue(projectRow.venue ?? "");
    }

    const { data, error } = await supabase
      .from("document_items")
      .select("id, name, description, quantity, unit, lanes, unit_price, calculation_type")
      .eq("document_id", document.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("loadDocument items failed", error);
      return;
    }

    setItems(
      (data ?? []).map((item, index) => ({
        id: index + 1,
        name: item.name ?? "",
        description: item.description ?? "",
        quantity: Number(item.quantity ?? 1),
        unit: item.unit ?? "式",
        lanes: Number(item.lanes ?? 1),
        unitPrice: Number(item.unit_price ?? 0),
        calculationType: item.calculation_type === "lane" ? "lane" : "standard",
      }))
    );
  };

  useEffect(() => {
    if (session) {
      loadBinderDocuments(documentType);
    }
  }, [session, documentType]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + lineAmount(item), 0),
    [items]
  );
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const updateItem = (id: number, patch: Partial<LineItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const addItem = () => {
    setItems((current) => [...current, blankItem()]);
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const choosePreset = (id: number, name: string) => {
    const preset = itemPresets.find((item) => item.name === name);
    if (!preset) {
      updateItem(id, { name });
      return;
    }
    updateItem(id, {
      name,
      unitPrice: preset.unitPrice,
      unit: preset.unit,
      calculationType: preset.calculationType,
      lanes: preset.calculationType === "lane" ? 1 : 1,
    });
  };

  const resetInvoice = () => {
    setCustomer("");
    setProjectName("");
    setEventDate("");
    setVenue("");
    setSubject("");
    setInvoiceNo("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setFirstMeta("");
    setSecondMeta("");
    setThirdMeta("");
    setNotes("");
    setItems([blankItem()]);
    setProjectId(null);
    setDocumentId(null);
    setSaveState("idle");
  };

  const saveDocument = async () => {
    if (!customer.trim() || !projectName.trim() || !subject.trim()) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    setSaveError("");

    try {
      let savedProjectId = projectId;

      let { data: customerRow, error: customerLookupError } = await supabase
        .from("customers")
        .select("id")
        .eq("name", customer.trim())
        .maybeSingle();

      if (customerLookupError) throw customerLookupError;

      if (!customerRow) {
        const { data: createdCustomer, error: createCustomerError } = await supabase
          .from("customers")
          .insert({ name: customer.trim() })
          .select("id")
          .single();

        if (createCustomerError) throw createCustomerError;
        customerRow = createdCustomer;
      }

      if (!savedProjectId) {
        const { data: createdProject, error: createProjectError } = await supabase
          .from("projects")
          .insert({
            customer_id: customerRow.id,
            name: projectName.trim(),
            event_date: eventDate || null,
            venue: venue.trim() || null,
            status: documentType === "estimate" ? "estimating" : "active",
          })
          .select("id")
          .single();

        if (createProjectError) throw createProjectError;
        savedProjectId = createdProject.id;
        setProjectId(savedProjectId);
      } else {
        const { error: updateProjectError } = await supabase
          .from("projects")
          .update({
            customer_id: customerRow.id,
            name: projectName.trim(),
            event_date: eventDate || null,
            venue: venue.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedProjectId);

        if (updateProjectError) throw updateProjectError;
      }

      const documentPayload = {
        project_id: savedProjectId,
        document_type: documentType,
        document_number: invoiceNo.trim() || null,
        issue_date: issueDate || null,
        subject: subject.trim(),
        customer_name: customer.trim(),
        first_meta: firstMeta.trim() || null,
        second_meta: secondMeta.trim() || null,
        third_meta: thirdMeta.trim() || null,
        notes: notes.trim() || null,
        subtotal,
        tax,
        total,
        updated_at: new Date().toISOString(),
      };

      let savedDocumentId = documentId;

      if (!savedDocumentId) {
        const { data: createdDocument, error: createDocumentError } = await supabase
          .from("documents")
          .insert(documentPayload)
          .select("id")
          .single();

        if (createDocumentError) throw createDocumentError;
        savedDocumentId = createdDocument.id;
        setDocumentId(savedDocumentId);
      } else {
        const { error: updateDocumentError } = await supabase
          .from("documents")
          .update(documentPayload)
          .eq("id", savedDocumentId);

        if (updateDocumentError) throw updateDocumentError;

        const { error: deleteItemsError } = await supabase
          .from("document_items")
          .delete()
          .eq("document_id", savedDocumentId);

        if (deleteItemsError) throw deleteItemsError;
      }

      const itemRows = items
        .filter((item) => item.name.trim())
        .map((item, index) => ({
          document_id: savedDocumentId,
          sort_order: index,
          name: item.name.trim(),
          description: item.description.trim() || null,
          quantity: item.quantity,
          unit: item.unit,
          lanes: item.lanes,
          unit_price: item.unitPrice,
          calculation_type: item.calculationType,
          amount: lineAmount(item),
        }));

      if (itemRows.length > 0) {
        const { error: insertItemsError } = await supabase
          .from("document_items")
          .insert(itemRows);

        if (insertItemsError) throw insertItemsError;
      }

      await loadBinderDocuments(documentType);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (error) {
      console.error("saveDocument failed", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message ?? "Unknown error")
            : String(error);
      setSaveError(message);
      setSaveState("error");
    }
  };

  if (authLoading && !session) {
    return (
      <main className="authShell">
        <div className="authCard">接続中...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="authShell">
        <form className="authCard" onSubmit={handleLogin}>
          <div className="eyebrow">QLCLE SALES</div>
          <h1>ログイン</h1>
          <label>
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {authError && <div className="authError">{authError}</div>}
          <button className="primary" type="submit" disabled={authLoading}>
            {authLoading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="toolbar">
        <div>
          <div className="eyebrow">QLCLE SALES</div>
          <h1>{config.title}</h1>
          <div className="documentTabs">
            <button className={documentType === "invoice" ? "active" : ""} onClick={() => { setDocumentType("invoice"); resetInvoice(); }}>請求書</button>
            <button className={documentType === "estimate" ? "active" : ""} onClick={() => { setDocumentType("estimate"); resetInvoice(); }}>見積書</button>
            <button className={documentType === "delivery" ? "active" : ""} onClick={() => { setDocumentType("delivery"); resetInvoice(); }}>納品書</button>
          </div>
        </div>
        <div className="actions">
          <button onClick={resetInvoice}>新規</button>
          <button onClick={handleLogout}>ログアウト</button>
          <button onClick={saveDocument} disabled={saveState === "saving"}>
            {saveState === "saving" ? "保存中..." : saveState === "saved" ? "保存済" : "保存"}
          </button>
          <button>複製</button>
          <button className="danger">破棄</button>
          <button className="primary" onClick={() => window.print()}>
            PDF / 印刷
          </button>
        </div>
      </header>

      {saveState === "error" && (
        <div className="saveMessage error">
          <strong>保存できませんでした。</strong>
          <span>{saveError || "請求先・案件名・件名と接続状態を確認してください。"}</span>
        </div>
      )}
      <div className="projectBar">
        <label>
          案件名
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="例：マイナビ就職EXPO"
          />
        </label>
        <label>
          開催日
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </label>
        <label>
          会場
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="例：名古屋"
          />
        </label>
        {projectId && <span className="projectLinked">案件に接続中</span>}
      </div>

      <div className="workspace">
        <section className={`paper ${items.length >= 6 ? "printDense" : ""}`}>
          <div className="printTitle">{config.printTitle}</div>
          <div className="paperHeader">
            <div className="customerPicker">
              <label>請求先</label>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">選択してください</option>
                <option>株式会社マイナビ</option>
                <option>株式会社○○イベント</option>
                <option>△△株式会社</option>
              </select>
            </div>
            <div className="metaGrid">
              <label>
                {config.dateLabel}
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </label>
              <label>
                {config.numberLabel}
                <input
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="companyRow">
            <div className="recipient">
              <strong>{customer || "請求先を選択"}</strong>
              <span>御中</span>
            </div>
            <div className="company companyWithSeal">
              <strong>株式会社QLCLE</strong>
              <span className="representativeRow">
                代表取締役　寺川美鈴
                <img src="data:image/png;base64,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" alt="" className="companySeal" aria-hidden="true" />
              </span>
              <span>〒105-0011</span>
              <span>東京都港区芝公園2丁目11番13号</span>
              <span>登録番号 T8010401110141</span>
            </div>
          </div>

          <div className="subjectRow">
            <label>{config.subjectLabel}</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="subMeta">
            <label>
              {config.firstMetaLabel}
              <input
                type="text"
                value={firstMeta}
                onChange={(e) => setFirstMeta(e.target.value)}
                placeholder={config.firstMetaPlaceholder}
              />
            </label>
            <label>
              {config.secondMetaLabel}
              <input
                type="text"
                value={secondMeta}
                onChange={(e) => setSecondMeta(e.target.value)}
                placeholder={config.secondMetaPlaceholder}
              />
            </label>
            <label>
              {config.thirdMetaLabel}
              <input
                type="text"
                value={thirdMeta}
                onChange={(e) => setThirdMeta(e.target.value)}
                placeholder={config.thirdMetaPlaceholder}
              />
            </label>
          </div>

          <table className="items">
            <thead>
              <tr>
                <th>品名・説明</th>
                <th className="qtyCol">数量</th>
                <th className="unitCol">単位</th>
                <th className="laneCol">レーン</th>
                <th className="priceCol">単価</th>
                <th className="amountCol">金額</th>
                <th className="small"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="itemMain">
                    <input
                      className="itemName"
                      list="item-presets"
                      value={item.name}
                      onChange={(e) => choosePreset(item.id, e.target.value)}
                      placeholder="項目を選択または入力"
                    />
                    <textarea
                      className="itemDescription"
                      rows={2}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, { description: e.target.value })
                      }
                      placeholder="説明を入力（例：同日、東京・大阪の2会場にて実施）"
                    />
                    {item.description && (
                      <div className="itemDescriptionPrint">{item.description}</div>
                    )}
                  </td>
                  <td>
                    <input
                      className="number compact"
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="compact"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {item.calculationType === "lane" ? (
                      <div className="laneCell">
                        <input
                          className="number compact"
                          type="number"
                          min="1"
                          value={item.lanes}
                          onChange={(e) =>
                            updateItem(item.id, { lanes: Number(e.target.value) })
                          }
                        />
                        <button
                          type="button"
                          className="laneToggle"
                          title="レーン計算を使わない"
                          onClick={() =>
                            updateItem(item.id, { calculationType: "standard", lanes: 1 })
                          }
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="laneAdd"
                        title="レーン計算を使う"
                        onClick={() =>
                          updateItem(item.id, { calculationType: "lane", lanes: 1 })
                        }
                      >
                        ＋
                      </button>
                    )}
                  </td>
                  <td>
                    <input
                      className="number compact"
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, { unitPrice: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="amount">
                    {lineAmount(item).toLocaleString("ja-JP")}
                    {item.calculationType === "lane" && (
                      <div className="calcHint">
                        {item.quantity}{item.unit} × {item.lanes}レーン
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className="iconButton"
                      aria-label="行を削除"
                      onClick={() => removeItem(item.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <datalist id="item-presets">
            {itemPresets.map((item) => (
              <option key={item.name} value={item.name} />
            ))}
          </datalist>

          <button className="addRow" onClick={addItem}>
            ＋ 明細を追加
          </button>

          <div className="totals">
            <div><span>小計</span><strong>{subtotal.toLocaleString("ja-JP")} 円</strong></div>
            <div><span>消費税 10%</span><strong>{tax.toLocaleString("ja-JP")} 円</strong></div>
            <div className="grandTotal"><span>合計</span><strong>{total.toLocaleString("ja-JP")} 円</strong></div>
          </div>

          <div className="notes">
            <label>備考</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="必要な場合のみ入力"
            />
          </div>

          {config.showPayment && (
            <div className="paymentSection">
              <div className="bankBox">
                <div><span>振込先：</span><strong>みずほ銀行　神谷町支店</strong></div>
                <div><span>口座：</span><strong>普通預金　1327393</strong></div>
                <div><span>口座名義：</span><strong>株式会社 QLCLE（クルクル）</strong></div>
              </div>
              <div className="paymentNote">
                左記口座にご請求金額のお振込み願いします。<br />
                尚、お振込み手数料はお客さまご負担にてお願い致します。
              </div>
            </div>
          )}
        </section>

        <aside className="binder">
          <div className="binderTop">
            <span>{config.binderLabel}</span>
            <button>検索</button>
          </div>
          <div className="binderMonth">保存済み</div>
          <div className="binderList">
            {binderLoading ? (
              <div className="binderEmpty">読込中...</div>
            ) : binderDocuments.length === 0 ? (
              <div className="binderEmpty">まだ保存された書類はありません</div>
            ) : (
              binderDocuments.map((document) => {
                const date = document.issue_date
                  ? document.issue_date.replaceAll("-", "/")
                  : "日付なし";

                return (
                  <button
                    className={"binderTab " + (document.id === documentId ? "active" : "")}
                    key={document.id}
                    onClick={() => loadDocument(document)}
                  >
                    <span className="binderDate">{date}</span>
                    <span className="binderCustomer">{document.customer_name || "名称未設定"}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="binderNav">
            <button onClick={() => loadBinderDocuments(documentType)}>↻ 更新</button>
            <span>{binderDocuments.length}件</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
