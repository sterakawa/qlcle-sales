"use client";

import { useMemo, useState } from "react";

type CalculationType = "standard" | "lane";

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
  { name: "オペレーター費", unitPrice: 30000, unit: "人", calculationType: "standard" as CalculationType },
  { name: "カメラマン費", unitPrice: 40000, unit: "人", calculationType: "standard" as CalculationType },
  { name: "交通費", unitPrice: 0, unit: "式", calculationType: "standard" as CalculationType },
  { name: "搬入・テスト稼働費", unitPrice: 0, unit: "式", calculationType: "standard" as CalculationType },
  { name: "機材費", unitPrice: 0, unit: "台", calculationType: "standard" as CalculationType },
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
  const [customer, setCustomer] = useState("株式会社マイナビ");
  const [subject, setSubject] = useState("イベント運営費");
  const [invoiceNo, setInvoiceNo] = useState("2026-001");
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
    setItems([blankItem()]);
  };

  return (
    <main className="shell">
      <header className="toolbar">
        <div>
          <div className="eyebrow">QLCLE SALES</div>
          <h1>請求書</h1>
        </div>
        <div className="actions">
          <button onClick={resetInvoice}>新規</button>
          <button>保存</button>
          <button>複製</button>
          <button className="danger">破棄</button>
          <button className="primary" onClick={() => window.print()}>
            PDF / 印刷
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className={`paper ${items.length >= 6 ? "printDense" : ""}`}>
          <div className="printTitle">請 求 書</div>
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
                請求日
                <input type="date" defaultValue="2026-09-28" />
              </label>
              <label>
                請求番号
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
            <label>請求件名</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="subMeta">
            <label>
              受渡期日
              <input type="text" placeholder="例：2026年9月28日" />
            </label>
            <label>
              受渡場所
              <input type="text" placeholder="例：会場" />
            </label>
            <label>
              支払条件
              <input type="text" placeholder="例：月末締め翌月末払い" />
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
                      <input
                        className="number compact"
                        type="number"
                        min="1"
                        value={item.lanes}
                        onChange={(e) =>
                          updateItem(item.id, { lanes: Number(e.target.value) })
                        }
                      />
                    ) : (
                      <span className="notUsed">—</span>
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
            <textarea rows={3} placeholder="必要な場合のみ入力" />
          </div>

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
        </section>

        <aside className="binder">
          <div className="binderTop">
            <span>請求書バインダー</span>
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
