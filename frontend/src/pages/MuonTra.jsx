import { useState, useEffect } from "react";
import axios from "axios";

function MuonTra() {
    const [loanData, setLoanData] = useState({ id_doc_gia: "", ma_vach_id: "", han_tra: "" });
    const [readerInfo, setReaderInfo] = useState({ name: "", status: "", isExpired: false });
    const [loans, setLoans] = useState([]); // Danh sách gốc từ server
    const [filteredLoans, setFilteredLoans] = useState([]); // Danh sách sau khi lọc để hiển thị
    const [penaltyRate, setPenaltyRate] = useState(0);

    useEffect(() => { 
        fetchLoans(); 
        fetchSystemConfig(); 
    }, []);

    // 1. Tự động lọc danh sách khi người dùng nhập Mã Độc giả
    useEffect(() => {
        if (!loanData.id_doc_gia.trim()) {
            setFilteredLoans(loans);
        } else {
            const searchText = loanData.id_doc_gia.toUpperCase();
            const filtered = loans.filter(l => 
                (l.id_doc_gia && l.id_doc_gia.toUpperCase().includes(searchText)) ||
                (l.ho_ten && l.ho_ten.toUpperCase().includes(searchText))
            );
            setFilteredLoans(filtered);
        }
    }, [loanData.id_doc_gia, loans]);

    // 2. Kiểm tra thông tin độc giả và số lượng sách đang mượn ngay trên UI
    useEffect(() => {
        if (loanData.id_doc_gia.length >= 3) {
            // Tìm trong danh sách đang mượn để hiện thông báo nhanh
            const activeLoans = loans.filter(l => l.id_doc_gia === loanData.id_doc_gia.toUpperCase());
            if (activeLoans.length > 0) {
                setReaderInfo({ 
                    name: activeLoans[0].ho_ten, 
                    status: `⚠️ Đang nợ ${activeLoans.length} cuốn sách`,
                    isExpired: false 
                });
            } else {
                setReaderInfo({ name: "Độc giả mới hoặc đã trả hết sách", status: "", isExpired: false });
            }
        } else {
            setReaderInfo({ name: "", status: "", isExpired: false });
        }
    }, [loanData.id_doc_gia, loans]);

    const fetchSystemConfig = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/caidat");
            // Lấy mức phạt từ bảng cai_dat
            const pRate = res.data.find(i => i.ten_tham_so === 'tien_phat_ngay');
            setPenaltyRate(pRate ? parseInt(pRate.gia_tri) : 5000);

            // Tự động tính hạn trả dựa trên thoi_han_muon_mac_dinh
            const dDays = res.data.find(i => i.ten_tham_so === 'thoi_han_muon_mac_dinh');
            const days = dDays ? parseInt(dDays.gia_tri) : 14;
            
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            setLoanData(prev => ({ ...prev, han_tra: futureDate.toISOString().split('T')[0] }));
        } catch (err) { console.error("Lỗi tải cấu hình"); }
    };

    const fetchLoans = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/muontra/dang-muon");
            setLoans(res.data);
            setFilteredLoans(res.data);
        } catch (err) { console.error("Lỗi tải danh sách"); }
    };

    const handleLoan = async () => {
        try {
            const res = await axios.post("http://localhost:5000/api/muontra/muon", loanData);
            if (res.data.success) {
                alert("Mượn sách thành công!");
                setLoanData(prev => ({ ...prev, id_doc_gia: "", ma_vach_id: "" }));
                fetchLoans();
            }
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.error || "Thất bại"));
        }
    };

    const handleReturn = async (id_phieu, ma_vach_id) => {
        if (window.confirm("Xác nhận trả sách?")) {
            try {
                const res = await axios.post("http://localhost:5000/api/muontra/tra", { id_phieu, ma_vach_id });
                if (res.data.success) {
                    const r = res.data.receipt;
                    // Hiển thị thông báo trả thành công kèm tiền phạt nếu có
                    alert(`✅ TRẢ SÁCH THÀNH CÔNG\nĐộc giả: ${r.ho_ten}\nTiền phạt: ${r.tien_phat.toLocaleString()} VNĐ`);
                    fetchLoans();
                }
            } catch (err) { alert("Lỗi: " + err.message); }
        }
    };

    return (
        <div style={containerStyle}>
            <div style={headerFlex}>
                <h2 style={titleStyle}>📖 QUẢN LÝ MƯỢN TRẢ</h2>
                <div style={badgeStyle}>
                    Mức phạt: <span style={{ color: '#e74c3c' }}>{penaltyRate.toLocaleString()}đ</span> / ngày
                </div>
            </div>

            <div style={formCard}>
                <h3 style={subTitleStyle}>➕ Thực hiện mượn sách & Tìm kiếm</h3>
                <div style={inputGroup}>
                    <div style={inputWrapper}>
                        <input 
                            style={inputStyle} 
                            placeholder="Nhập Mã Độc giả..." 
                            value={loanData.id_doc_gia} 
                            onChange={e => setLoanData({ ...loanData, id_doc_gia: e.target.value })} 
                        />
                        <div style={hintStyle}>
                            <b>{readerInfo.name}</b> <span style={{color: '#e67e22'}}>{readerInfo.status}</span>
                        </div>
                    </div>
                    <div style={inputWrapper}>
                        <input 
                            style={inputStyle} 
                            placeholder="Mã vạch sách" 
                            value={loanData.ma_vach_id} 
                            onChange={e => setLoanData({ ...loanData, ma_vach_id: e.target.value })} 
                        />
                    </div>
                    <div style={inputWrapper}>
                        <input type="date" style={inputStyle} value={loanData.han_tra} onChange={e => setLoanData({ ...loanData, han_tra: e.target.value })} />
                        <div style={hintStyle}>Hạn trả mặc định</div>
                    </div>
                    <button onClick={handleLoan} style={primaryBtn}>XÁC NHẬN MƯỢN</button>
                </div>
            </div>

            <div style={tableCard}>
                <div style={tableHeaderStyle}>
                    {loanData.id_doc_gia ? `Danh sách sách đang mượn của: ${loanData.id_doc_gia}` : "Danh sách sách đang mượn"} ({filteredLoans.length})
                </div>
                <table style={tableStyle}>
                    <thead>
                        <tr style={theadStyle}>
                            <th style={thStyle}>Độc giả</th>
                            <th style={thStyle}>Sách (Mã vạch)</th>
                            <th style={thStyle}>Hạn trả</th>
                            <th style={thStyle}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLoans.map((l, i) => (
                            <tr key={i} style={trStyle}>
                                <td style={tdStyle}>
                                    <b>{l.ho_ten}</b>
                                    <div style={{fontSize: '11px', color: '#666'}}>{l.id_doc_gia}</div>
                                </td>
                                <td style={tdStyle}>
                                    {l.ten_sach}
                                    <div style={{fontSize: '11px', color: '#94a3b8'}}>ID: {l.ma_vach_id}</div>
                                </td>
                                <td style={{...tdStyle, color: new Date(l.han_tra) < new Date() ? 'red' : 'green', fontWeight: 'bold'}}>
                                    {new Date(l.han_tra).toLocaleDateString("vi-VN")}
                                    {new Date(l.han_tra) < new Date() && " (Quá hạn!)"}
                                </td>
                                <td style={tdStyle}>
                                    <button onClick={() => handleReturn(l.id_phieu, l.ma_vach_id)} style={secondaryBtn}>TRẢ SÁCH</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Style CSS
const tableHeaderStyle = { padding: '15px 20px', background: '#fff', borderBottom: '1px solid #eee', fontWeight: '700', color: '#2c3e50' };
const headerFlex = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const badgeStyle = { background: "#fff", padding: "8px 15px", borderRadius: "10px", border: "1px solid #e0e7ff", fontSize: "13px", fontWeight: "600" };
const containerStyle = { padding: "25px", background: "#f8faff", minHeight: "100vh" };
const titleStyle = { color: "#2c3e50", fontSize: "22px", fontWeight: "800" };
const formCard = { background: "#fff", padding: "20px", borderRadius: "20px", border: "1px solid #f0f0f0", marginBottom: "25px" };
const subTitleStyle = { fontSize: "16px", color: "#5d78ff", marginBottom: "20px", fontWeight: "700" };
const inputGroup = { display: "flex", gap: "15px", flexWrap: "wrap" };
const inputWrapper = { flex: 1, minWidth: "200px" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #e0e7ff" };
const hintStyle = { fontSize: "11px", marginTop: "5px", fontWeight: "500" };
const primaryBtn = { background: "#2ecc71", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" };
const tableCard = { background: "#fff", borderRadius: "20px", border: "1px solid #f0f0f0", overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#f8faff" };
const thStyle = { padding: "15px 20px", textAlign: "left", color: "#718096", fontSize: "13px" };
const trStyle = { borderBottom: "1px solid #f8faff" };
const tdStyle = { padding: "15px 20px", fontSize: "14px" };
const secondaryBtn = { background: "#fff1f0", color: "#ff4d4f", border: "1px solid #ffccc7", padding: "8px 15px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };

export default MuonTra;