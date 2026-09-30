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

const sampleInvoices = [
  { date: "09/28", customer: "株式会社マイナビ" },
  { date: "09/24", customer: "株式会社○○イベント" },
  { date: "09/21", customer: "△△株式会社" },
  { date: "09/18", customer: "株式会社サンプル" },
  { date: "09/15", customer: "□□株式会社" },
  { date: "09/12", customer: "株式会社テスト" },
  { date: "09/09", customer: "○○企画株式会社" },
  { date: "09/06", customer: "株式会社イベントラボ" },
  { date: "09/03", customer: "株式会社デモ" },
  { date: "09/01", customer: "株式会社サンプル東京" },
];

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
    if (!customer.trim() || !subject.trim()) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");

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
            name: subject.trim(),
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
            name: subject.trim(),
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

      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (error) {
      console.error("saveDocument failed", error);
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
            <button className={documentType === "invoice" ? "active" : ""} onClick={() => setDocumentType("invoice")}>請求書</button>
            <button className={documentType === "estimate" ? "active" : ""} onClick={() => setDocumentType("estimate")}>見積書</button>
            <button className={documentType === "delivery" ? "active" : ""} onClick={() => setDocumentType("delivery")}>納品書</button>
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
        <div className="saveMessage error">保存できませんでした。請求先・件名と接続状態を確認してください。</div>
      )}
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
            <div className="company">
              <strong>株式会社QLCLE</strong>
              <span>代表取締役　寺川美鈴</span>
              <span>〒105-0011</span>
              <span>東京都港区芝公園2丁目11番13号</span>
              <span>TEL 03-5733-6528</span>
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
          <div className="binderMonth">2026年9月</div>
          <div className="binderList">
            {sampleInvoices.map((invoice, index) => (
              <button
                className={"binderTab " + (index === 0 ? "active" : "")}
                key={invoice.date + invoice.customer}
              >
                <span className="binderDate">2026/{invoice.date}</span>
                <span className="binderCustomer">{invoice.customer}</span>
              </button>
            ))}
          </div>
          <div className="binderNav">
            <button>‹ 前月</button>
            <span>2026年9月</span>
            <button>次月 ›</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
