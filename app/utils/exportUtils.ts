/**
 * HAL问卷系统 - 导出工具
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { PatientInfo, HalAnswers, DomainScores, PatientRecord, HaemqolScores } from '../types';
import * as XLSX from 'xlsx';
import { HAEMQOL_SCORE_DESCRIPTIONS } from '../haemqol/questions';

// 域名标题映射
const DOMAIN_TITLES: Record<string, string> = {
  // HAEMO-QoL-A问卷字段
  part1: "问卷一",
  part2: "问卷二", 
  part3: "问卷三", 
  part4: "问卷四", 
  total: "总分",
  
  // HAL问卷字段
  LSKS: "躺坐跪站",
  LEGS: "下肢功能",
  ARMS: "上肢功能",
  TRANS: "交通工具",
  SELFC: "自我照料",
  HOUSEH: "家务劳动",
  LEISPO: "休闲体育",
  
  // 特殊值
  UPPER: "上肢活动",
  LOWBAS: "基础下肢",
  LOWCOM: "复杂下肢",
  sumScore: "国标总分",
  
  // 兼容性字段 - 旧版本命名
  UPP: "上肢功能",
  HOUSL: "家务劳动",
  LEHOW: "休闲体育",
  WORK: "工作学校"
};

/**
 * 获取域名对应的中文标题
 * 
 * @param domain 域名（如LSKS、LOWBAS等）
 * @returns 对应的中文标题，若无匹配则返回原域名
 */
export function getDomainTitle(domain: string): string {
  return DOMAIN_TITLES[domain] || domain;
}

/**
 * 格式化日期为YYYY-MM-DD格式
 * @param date 日期对象或日期字符串
 * @returns 格式化的日期字符串
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * 格式化答案文本
 * @param value 答案值
 * @returns 格式化的答案文本
 */
export function formatAnswerText(value: string): string {
  switch (value) {
    case '1': return '不可能完成';
    case '2': return '能完成但总是有困难';
    case '3': return '大部分时间有困难';
    case '4': return '有时有困难';
    case '5': return '很少有困难';
    case '6': return '从来没有困难';
    case '8': return '不适用';
    default: return '未回答';
  }
}

/**
 * 准备导出数据
 * @param patient 患者信息
 * @param answers 问卷答案
 * @param domainScores 域评分
 * @param haemqolScores HAEMO-QoL-A问卷分数
 * @returns 准备好的导出数据
 */
export function prepareExportData(
  patient: PatientInfo, 
  answers: HalAnswers,
  domainScores: DomainScores,
  haemqolScores?: HaemqolScores
): Record<string, any> {
  const formattedEvaluationDate = formatDate(patient.evaluationDate);
  const formattedFollowUpDate = formatDate(patient.nextDate);
  
  // 基础患者信息
  const exportData: Record<string, any> = {
    '患者姓名': patient.patientName,
    '龄段': patient.ageGroup || '',
    '年龄': patient.age,
    '体重': patient.weight,
    '身高': patient.height,
    '每周给药次数': patient.treatmentTimes,
    '每次剂量': patient.treatmentDose,
    '评估日期': formattedEvaluationDate,
    '下次时间': formattedFollowUpDate,
  };
  
  // 先添加HAEMO-QoL-A问卷分数（成人血友病患者生存质量量表）
  if (haemqolScores) {
    exportData['成人血友病患者生存质量量表'] = ''; // 添加大标题行
    exportData['问卷一'] = haemqolScores.part1 !== null ? haemqolScores.part1 : '';
    exportData['问卷二'] = haemqolScores.part2 !== null ? haemqolScores.part2 : '';
    exportData['问卷三'] = haemqolScores.part3 !== null ? haemqolScores.part3 : '';
    exportData['问卷四'] = haemqolScores.part4 !== null ? haemqolScores.part4 : '';
    exportData['总分'] = haemqolScores.total !== null ? haemqolScores.total : '';
  }
  
  // 再添加成人血友病活动列表（HAL）评分
  exportData['成人血友病活动列表'] = ''; // 添加大标题行
  exportData['躺坐跪站'] = domainScores.LSKS !== null ? domainScores.LSKS : '';
  exportData['下肢功能'] = domainScores.LEGS !== null ? domainScores.LEGS : '';
  exportData['上肢功能'] = domainScores.ARMS !== null ? domainScores.ARMS : '';
  exportData['交通工具'] = domainScores.TRANS !== null ? domainScores.TRANS : '';
  exportData['自我照料'] = domainScores.SELFC !== null ? domainScores.SELFC : '';
  exportData['家务劳动'] = domainScores.HOUSEH !== null ? domainScores.HOUSEH : '';
  exportData['休闲体育'] = domainScores.LEISPO !== null ? domainScores.LEISPO : '';
  
  // 添加重新编码域评分
  if (domainScores.newEncodedScores) {
    exportData['上肢活动'] = domainScores.newEncodedScores.UPPER !== null ? domainScores.newEncodedScores.UPPER : '';
    exportData['基础下肢'] = domainScores.newEncodedScores.LOWBAS !== null ? domainScores.newEncodedScores.LOWBAS : '';
    exportData['复杂下肢'] = domainScores.newEncodedScores.LOWCOM !== null ? domainScores.newEncodedScores.LOWCOM : '';
  }
  
  // 添加HAL总分
  exportData['国标总分'] = domainScores.sumScore !== null ? domainScores.sumScore : '';
  
  return exportData;
}

/**
 * 检查是否在Electron环境中
 * @returns 是否在Electron环境中
 */
export function isElectron(): boolean {
  // @ts-ignore
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
}

/**
 * 导出为CSV文件
 * @param patient 患者信息或数据数组
 * @param answers 问卷答案
 * @param domainScores 域评分
 * @param haemqolScores HAEMO-QoL-A问卷分数
 */
export function exportToCSV(
  patient: PatientInfo | any[], 
  answers?: any,
  domainScores?: DomainScores,
  haemqolScores?: HaemqolScores
): void | Promise<{ success: boolean, message?: string, filePath?: string }> {
  // 判断是否是新API调用方式（传入数组）
  if (Array.isArray(patient)) {
    return exportCSVData(patient, answers as string);
  }
  
  // 旧API调用方式
  const exportData = prepareExportData(
    patient as PatientInfo, 
    answers as HalAnswers, 
    domainScores as DomainScores,
    haemqolScores
  );
  const formattedDate = formatDate((patient as PatientInfo).evaluationDate);
  const fileName = `HAL_${(patient as PatientInfo).patientName}_${formattedDate}.csv`;
  
  return exportCSVData([exportData], fileName);
}

// 新的内部实现
async function exportCSVData(
  data: any[], 
  filename: string
): Promise<{ success: boolean, message?: string, filePath?: string }> {
  try {
    // 准备CSV内容
    const headers = Object.keys(data[0]);
    
    // 创建二维表格
    const rows: string[][] = [];
    
    // 添加两行表头
    // 第一行: 大分组标题
    const headerRow1: string[] = [];
    // 第二行: 详细字段名
    const headerRow2: string[] = [];
    
    // 处理表头，识别分组
    let currentGroup = '';
    headers.forEach(header => {
      // 检查是否是分组标题
      if (header === '成人血友病患者生存质量量表' || header === '成人血友病活动列表') {
        currentGroup = header;
        // 为分组标题添加空单元格
        headerRow1.push(header);
        headerRow2.push('');
      } else if (currentGroup && ['问卷一', '问卷二', '问卷三', '问卷四', '总分', 
                                '躺坐跪站', '下肢功能', '上肢功能', '交通工具', '自我照料', 
                                '家务劳动', '休闲体育', '上肢活动', '基础下肢', '复杂下肢', '国标总分'].includes(header)) {
        // 分组下的子项
        headerRow1.push('');  // 大分组行的对应位置为空
        headerRow2.push(header);  // 详细字段行
      } else {
        // 基础患者信息字段
        headerRow1.push('');
        headerRow2.push(header);
      }
    });
    
    // 添加两行表头
    rows.push(headerRow1);
    rows.push(headerRow2);
    
    // 添加数据行
    data.forEach(row => {
      const rowData: string[] = [];
      headers.forEach(field => {
        const value = row[field];
        const cellValue = value === null || value === undefined ? '' : value.toString();
        // 如果值包含逗号、双引号或换行符，需要用双引号包裹并转义双引号
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
          rowData.push(`"${cellValue.replace(/"/g, '""')}"`);
        } else {
          rowData.push(cellValue);
        }
      });
      rows.push(rowData);
    });
    
    // 构造CSV内容
    const csvContent = rows.map(row => row.join(',')).join('\n');
    
    // 检查是否在Electron环境中
    if (isElectron()) {
      // 使用Electron API保存文件
      // @ts-ignore
      const result = await window.electronAPI.saveFile({
        content: csvContent,
        fileName: filename,
        fileType: 'csv'
      });
      return result;
    } else {
      // 浏览器环境，使用下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    }
  } catch (error: unknown) {
    console.error('导出CSV错误:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `导出失败: ${errorMessage}` };
  }
}

/**
 * 导出为Excel文件
 * @param patient 患者信息或数据数组
 * @param answers 问卷答案
 * @param domainScores 域评分
 * @param haemqolScores HAEMO-QoL-A问卷分数
 * @param sheetName 工作表名称
 */
export function exportToExcel(
  patient: PatientInfo | any[], 
  answers?: any,
  domainScores?: DomainScores,
  haemqolScores?: HaemqolScores,
  sheetName: string = 'HAL评估结果'
): void | Promise<{ success: boolean, message?: string, filePath?: string }> {
  // 判断是否是新API调用方式（传入数组）
  if (Array.isArray(patient)) {
    return exportExcelData(patient, answers as string, sheetName);
  }
  
  // 旧API调用方式
  const exportData = prepareExportData(
    patient as PatientInfo, 
    answers as HalAnswers, 
    domainScores as DomainScores,
    haemqolScores
  );
  const formattedDate = formatDate((patient as PatientInfo).evaluationDate);
  const fileName = `HAL_${(patient as PatientInfo).patientName}_${formattedDate}.xlsx`;
  
  return exportExcelData([exportData], fileName, sheetName);
}

// 新的内部实现
async function exportExcelData(
  data: any[], 
  filename: string,
  sheetName: string = 'HAL评估结果'
): Promise<{ success: boolean, message?: string, filePath?: string }> {
  try {
    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = {
      SheetNames: [sheetName],
      Sheets: {
        [sheetName]: worksheet
      }
    };
    
    // 检查是否在Electron环境中
    if (isElectron()) {
      // 使用XLSX库的writeXLSX方法生成二进制数据
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // 使用Electron API保存文件
      // @ts-ignore
      const result = await window.electronAPI.saveFile({
        content: excelBuffer,
        fileName: filename,
        fileType: 'xlsx'
      });
      return result;
    } else {
      // 浏览器环境，使用下载链接
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    }
  } catch (error: unknown) {
    console.error('导出Excel错误:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `导出失败: ${errorMessage}` };
  }
}

/**
 * 批量导出评估记录为Excel
 * @param records 患者评估记录数组
 */
export function batchExportToExcel(records: PatientRecord[]): void {
  if (records.length === 0) {
    alert("尚未有任何患者记录，无法导出。");
    return;
  }

  // 构造表格数据
  const exportDataArray: Record<string, any>[] = [];
  
  // 遍历所有患者
  records.forEach(record => {
    const { patientInfo, answers, haemqolAnswers, assessmentResult } = record;
    
    if (!patientInfo || !assessmentResult || !assessmentResult.domainScores) return;
    
    // 准备导出数据
    const data = prepareExportData(
      patientInfo, 
      answers,
      {
        ...assessmentResult.domainScores,
        newEncodedScores: assessmentResult.newEncodedScores,
        sumScore: assessmentResult.sumScore
      },
      assessmentResult.haemqolScores
    );
    
    exportDataArray.push(data);
  });
  
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(exportDataArray);
  
  // 创建工作簿
  const workbook: XLSX.WorkBook = {
    Sheets: { '患者评估记录': worksheet },
    SheetNames: ['患者评估记录']
  };
  
  // 调整列宽
  if (exportDataArray.length > 0) {
    const wscols = Object.keys(exportDataArray[0]).map(key => ({ wch: Math.max(key.length * 2, 12) }));
    worksheet['!cols'] = wscols;
  }
  
  // 下载文件
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `HAL_患者评估记录_${timestamp}.xlsx`);
}

/**
 * 批量导出评估记录为CSV
 * @param records 患者评估记录数组
 */
export function batchExportToCSV(records: PatientRecord[]): void {
  if (records.length === 0) {
    alert("尚未有任何患者记录，无法导出。");
    return;
  }
  
  try {
    // 准备导出数据
    const exportDataArray = records.map(record => {
      const { patientInfo, answers, haemqolAnswers, assessmentResult } = record;
      
      if (!patientInfo || !assessmentResult || !assessmentResult.domainScores) return null;
      
      return prepareExportData(
        patientInfo, 
        answers,
        {
          ...assessmentResult.domainScores,
          newEncodedScores: assessmentResult.newEncodedScores,
          sumScore: assessmentResult.sumScore
        },
        assessmentResult.haemqolScores
      );
    }).filter(Boolean);
    
    if (exportDataArray.length === 0) {
      alert("没有有效的患者记录数据，无法导出。");
      return;
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `HAL_患者评估记录_${timestamp}.csv`;
    
    // 使用通用的导出函数
    exportCSVData(exportDataArray, fileName);
  } catch (error) {
    console.error('批量导出CSV失败:', error);
    alert(`批量导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 批量导出评估记录
 * @param records 患者评估记录数组
 * @param format 导出格式 ('csv' | 'excel')
 */
export function batchExport(
  records: PatientRecord[],
  format: 'csv' | 'excel' = 'excel'
): void {
  if (records.length === 0) {
    alert("尚未有任何患者记录，无法导出。");
    return;
  }

  try {
    // 准备导出数据
    const exportDataArray = records.map(record => {
      const { patientInfo, answers, haemqolAnswers, assessmentResult } = record;
      
      if (!patientInfo || !assessmentResult || !assessmentResult.domainScores) return null;
      
      return prepareExportData(
        patientInfo, 
        answers,
        {
          ...assessmentResult.domainScores,
          newEncodedScores: assessmentResult.newEncodedScores,
          sumScore: assessmentResult.sumScore
        },
        assessmentResult.haemqolScores
      );
    }).filter(Boolean);
    
    if (exportDataArray.length === 0) {
      alert("没有有效的患者记录数据，无法导出。");
      return;
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `HAL_患者评估记录_${timestamp}.${format}`;
    
    // 根据格式调用相应的导出函数
    if (format === 'csv') {
      exportCSVData(exportDataArray, fileName);
    } else {
      exportExcelData(exportDataArray, fileName, '患者评估记录');
    }
  } catch (error) {
    console.error('批量导出失败:', error);
    alert(`批量导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}