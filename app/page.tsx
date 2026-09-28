"use client";

import { useMemo, useState } from "react";

type LineItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

const itemPresets = [
  { name: "SPIXD 基本料金", unitPrice: 80000 },
  { name: "WEBカスタマイズ", unitPrice: 20000 },
  { name: "レシートカスタマイズ", unitPrice: 20000 },
  { name: "フレーム制作", unitPrice: 20000 },
  { name: "オペレーター費", unitPrice: 30000 },
  { name: "カメラマン費", unitPrice: 40000 },
  { name: "交通費", unitPrice: 0 },
  { name: "搬入・テスト稼働費", unitPrice: 0 },
  { name: "機材費", unitPrice: 0 },
];

const sampleInvoices = [
  "2026/09/28　株式会社マイナビ",
  "2026/09/18　株式会社○○イベント",
  "2026/09/05　△△株式会社",
];

export default function Home() {
  const [customer, setCustomer] = useState("株式会社マイナビ");
  const [subject, setSubject] = useState("イベント運営費");
  const [invoiceNo, setInvoiceNo] = useState("2026-001");
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, name: "SPIXD 基本料金", quantity: 1, unitPrice: 80000 },
  ]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
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
    setItems((current) => [
      ...current,
      { id: Date.now(), name: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const choosePreset = (id: number, name: string) => {
    const preset = itemPresets.find((item) => item.name === name);
    updateItem(id, {
      name,
      unitPrice: preset?.unitPrice ?? 0,
    });
  };

  const resetInvoice = () => {
    setCustomer("");
    setSubject("");
    setInvoiceNo("");
    setItems([{ id: Date.now(), name: "", quantity: 1, unitPrice: 0 }]);
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
          <button className="primary" onClick={() => window.print()}>
            PDF / 印刷
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="paper">
          <div className="paperHeader">
            <div>
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
              <span>会社情報・住所・登録番号は固定設定から表示</span>
              <span>振込先情報も固定設定として管理</span>
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
                <th>品名</th>
                <th className="number">数量</th>
                <th className="number">単価</th>
                <th className="number">金額</th>
                <th className="small"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      list="item-presets"
                      value={item.name}
                      onChange={(e) => choosePreset(item.id, e.target.value)}
                      placeholder="項目を選択または入力"
                    />
                  </td>
                  <td>
                    <input
                      className="number"
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="number"
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, { unitPrice: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="amount">
                    {(item.quantity * item.unitPrice).toLocaleString("ja-JP")}
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
        </section>

        <aside className="binder">
          <div className="binderTop">
            <span>請求書バインダー</span>
            <button>検索</button>
          </div>
          <div className="binderMonth">2026年9月</div>
          {sampleInvoices.map((invoice, index) => (
            <button
              className={"binderTab " + (index === 0 ? "active" : "")}
              key={invoice}
            >
              {invoice}
            </button>
          ))}
          <div className="binderNav">
            <button>‹ 前へ</button>
            <span>1 / 3</span>
            <button>次へ ›</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
