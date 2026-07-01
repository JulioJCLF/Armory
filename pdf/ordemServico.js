const PDFDocument = require('pdfkit');

const AZUL = '#1f6f43';
const CINZA = '#555555';

function fmtMoeda(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

function fmtData(d) {
  if (!d) return '-';
  const s = String(d).slice(0, 10).split('-');
  return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : d;
}

// Escreve o PDF da ordem de serviço no stream de resposta
function gerarOrdemServicoPDF(ordem, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="ordem-${ordem.numero || ordem.id}.pdf"`);
  doc.pipe(res);

  // Cabeçalho
  doc.rect(40, 40, 515, 60).fill(AZUL);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
    .text('ARMARIA AIRSOFT', 55, 55);
  doc.fontSize(10).font('Helvetica')
    .text('Ordem de Serviço', 55, 80);
  doc.fontSize(16).font('Helvetica-Bold')
    .text(ordem.numero || `OS-${ordem.id}`, 400, 60, { width: 140, align: 'right' });
  doc.fontSize(9).font('Helvetica')
    .text(`Entrada: ${fmtData(ordem.data_entrada)}`, 400, 82, { width: 140, align: 'right' });

  doc.fillColor('#000000');
  let y = 120;

  // Cliente
  const cli = ordem.cliente || {};
  doc.fontSize(11).font('Helvetica-Bold').fillColor(AZUL).text('CLIENTE', 40, y);
  doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor('#dddddd').stroke();
  y += 22;
  doc.fillColor('#000000').fontSize(10).font('Helvetica');
  doc.text(`Nome: ${cli.nome || '-'}`, 40, y);
  doc.text(`Telefone: ${cli.telefone || '-'}`, 320, y);
  y += 15;
  doc.text(`CPF: ${cli.cpf || '-'}`, 40, y);
  doc.text(`E-mail: ${cli.email || '-'}`, 320, y);
  y += 25;

  // Equipamento
  const eq = ordem.equipamento;
  doc.fontSize(11).font('Helvetica-Bold').fillColor(AZUL).text('EQUIPAMENTO', 40, y);
  doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor('#dddddd').stroke();
  y += 22;
  doc.fillColor('#000000').fontSize(10).font('Helvetica');
  if (eq) {
    doc.text(`Tipo: ${eq.tipo || '-'}`, 40, y);
    doc.text(`Marca/Modelo: ${eq.marca || ''} ${eq.modelo || ''}`.trim(), 200, y);
    doc.text(`FPS: ${eq.fps || '-'}`, 460, y);
    y += 15;
    doc.text(`Nº de série: ${eq.numero_serie || '-'}`, 40, y);
    y += 25;
  } else {
    doc.text('Não informado', 40, y);
    y += 25;
  }

  // Problema / serviço
  doc.fontSize(11).font('Helvetica-Bold').fillColor(AZUL).text('DESCRIÇÃO DO PROBLEMA', 40, y);
  doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor('#dddddd').stroke();
  y += 20;
  doc.fillColor('#000000').fontSize(10).font('Helvetica')
    .text(ordem.descricao_problema || '-', 40, y, { width: 515 });
  y = doc.y + 12;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(AZUL).text('SERVIÇO REALIZADO', 40, y);
  doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor('#dddddd').stroke();
  y += 20;
  doc.fillColor('#000000').fontSize(10).font('Helvetica')
    .text(ordem.servico_realizado || '-', 40, y, { width: 515 });
  y = doc.y + 15;

  // Tabela de peças
  doc.fontSize(11).font('Helvetica-Bold').fillColor(AZUL).text('PEÇAS / ITENS', 40, y);
  y += 18;
  doc.rect(40, y, 515, 18).fill('#eeeeee');
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
  doc.text('Descrição', 45, y + 5);
  doc.text('Qtd', 360, y + 5, { width: 40, align: 'center' });
  doc.text('Unit.', 410, y + 5, { width: 60, align: 'right' });
  doc.text('Total', 480, y + 5, { width: 70, align: 'right' });
  y += 18;
  doc.font('Helvetica');
  for (const p of (ordem.pecas || [])) {
    const total = (p.quantidade || 0) * (p.preco_unitario || 0);
    doc.text(p.descricao || '-', 45, y + 4, { width: 300 });
    doc.text(String(p.quantidade || 0), 360, y + 4, { width: 40, align: 'center' });
    doc.text(fmtMoeda(p.preco_unitario), 410, y + 4, { width: 60, align: 'right' });
    doc.text(fmtMoeda(total), 480, y + 4, { width: 70, align: 'right' });
    doc.moveTo(40, y + 18).lineTo(555, y + 18).strokeColor('#eeeeee').stroke();
    y += 18;
  }

  // Totais
  y += 8;
  doc.fontSize(10).font('Helvetica');
  doc.text('Total em peças:', 380, y, { width: 100, align: 'right' });
  doc.text(fmtMoeda(ordem.total_pecas), 480, y, { width: 70, align: 'right' });
  y += 15;
  doc.text('Mão de obra:', 380, y, { width: 100, align: 'right' });
  doc.text(fmtMoeda(ordem.valor_mao_obra), 480, y, { width: 70, align: 'right' });
  y += 18;
  doc.rect(370, y - 3, 185, 22).fill(AZUL);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
  doc.text('TOTAL:', 380, y + 2, { width: 90, align: 'right' });
  doc.text(fmtMoeda(ordem.total), 470, y + 2, { width: 80, align: 'right' });
  doc.fillColor('#000000');
  y += 45;

  // Termo + assinatura
  if (y > 680) { doc.addPage(); y = 60; }
  doc.fontSize(8).font('Helvetica').fillColor(CINZA).text(
    'Declaro que recebi o equipamento acima descrito e concordo com os serviços e valores apresentados. ' +
    'Esta guia deve ser apresentada na retirada do equipamento.',
    40, y, { width: 515 });
  y += 45;

  doc.strokeColor('#000000');
  doc.moveTo(60, y).lineTo(280, y).stroke();
  doc.moveTo(320, y).lineTo(540, y).stroke();
  doc.fillColor('#000000').fontSize(9);
  doc.text('Assinatura do Cliente', 60, y + 5, { width: 220, align: 'center' });
  doc.text('Responsável / Armaria', 320, y + 5, { width: 220, align: 'center' });

  doc.fontSize(8).fillColor(CINZA)
    .text(`Emitido em ${fmtData(new Date().toISOString())}  •  ${cli.nome || ''}`, 40, y + 40, { width: 515, align: 'center' });

  doc.end();
}

module.exports = { gerarOrdemServicoPDF };
