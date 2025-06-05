// 清理所有患者数据脚本
console.log('🗑️ 开始清理所有患者数据...');

const DB_NAME = 'hal-questionnaire-v2';

// 清理所有患者相关数据
async function clearAllPatientData() {
  console.log('🚀 正在清理所有患者数据...');
  
  try {
    const request = indexedDB.open(DB_NAME);
    
    request.onsuccess = () => {
      const db = request.result;
      
      // 需要清理的表
      const tablesToClear = [
        'patients',        // 患者基本信息
        'responses',       // 问卷响应
        'medical_info',    // 医疗信息
        'tasks',          // 任务信息
        'hal_answers',    // HAL问卷答案
        'haemqol_answers' // HAEMO-QoL-A问卷答案
      ];
      
      let clearedTables = 0;
      const totalTables = tablesToClear.length;
      
      tablesToClear.forEach(tableName => {
        try {
          const transaction = db.transaction([tableName], 'readwrite');
          const store = transaction.objectStore(tableName);
          
          // 清空整个表
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => {
            clearedTables++;
            console.log(`✅ 已清理表: ${tableName}`);
            
            if (clearedTables === totalTables) {
              console.log('🎉 所有患者数据清理完成！');
              console.log('📊 清理总结:');
              console.log(`  - 清理了 ${totalTables} 个数据表`);
              console.log('  - patients: 患者基本信息');
              console.log('  - responses: 问卷响应');
              console.log('  - medical_info: 医疗信息');
              console.log('  - tasks: 任务信息');
              console.log('  - hal_answers: HAL问卷答案');
              console.log('  - haemqol_answers: HAEMO-QoL-A问卷答案');
              console.log('');
              console.log('💡 提示: 刷新页面以确保UI更新');
            }
          };
          
          clearRequest.onerror = () => {
            console.error(`❌ 清理表 ${tableName} 失败:`, clearRequest.error);
          };
          
        } catch (error) {
          console.error(`❌ 访问表 ${tableName} 时出错:`, error);
        }
      });
    };
    
    request.onerror = () => {
      console.error('❌ 无法打开数据库:', request.error);
    };
    
  } catch (error) {
    console.error('❌ 清理数据时发生错误:', error);
  }
}

// 清理sessionStorage中的数据
function clearSessionStorageData() {
  console.log('🧹 清理sessionStorage数据...');
  
  const keysToRemove = [];
  
  // 找到所有相关的keys
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('hal_answers_') ||
      key.includes('haemqol_answers_') ||
      key.includes('patient_info_') ||
      key.includes('hal-questionnaire')
    )) {
      keysToRemove.push(key);
    }
  }
  
  // 删除找到的keys
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ 已删除sessionStorage: ${key}`);
  });
  
  console.log(`✅ 共清理了 ${keysToRemove.length} 个sessionStorage项目`);
}

// 清理localStorage中的数据
function clearLocalStorageData() {
  console.log('🧹 清理localStorage数据...');
  
  const keysToRemove = [];
  
  // 找到所有相关的keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('hal_answers_') ||
      key.includes('haemqol_answers_') ||
      key.includes('patient_info_') ||
      key.includes('hal-questionnaire')
    )) {
      keysToRemove.push(key);
    }
  }
  
  // 删除找到的keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ 已删除localStorage: ${key}`);
  });
  
  console.log(`✅ 共清理了 ${keysToRemove.length} 个localStorage项目`);
}

// 执行完整清理
async function performFullCleanup() {
  console.log('🔥 执行完整数据清理...');
  console.log('');
  
  // 1. 清理IndexedDB
  await clearAllPatientData();
  
  // 2. 清理sessionStorage
  clearSessionStorageData();
  
  // 3. 清理localStorage
  clearLocalStorageData();
  
  console.log('');
  console.log('🎉 完整清理完成！');
  console.log('💡 建议现在刷新页面以确保所有数据都已清除');
}

// 导出函数供控制台使用
window.clearAllPatientData = clearAllPatientData;
window.clearSessionStorageData = clearSessionStorageData;
window.clearLocalStorageData = clearLocalStorageData;
window.performFullCleanup = performFullCleanup;

// 提供使用说明
console.log('📖 数据清理工具已加载');
console.log('');
console.log('🔧 可用命令:');
console.log('  clearAllPatientData()     - 清理IndexedDB中的所有患者数据');
console.log('  clearSessionStorageData() - 清理sessionStorage中的相关数据');
console.log('  clearLocalStorageData()   - 清理localStorage中的相关数据'); 
console.log('  performFullCleanup()      - 执行完整清理（推荐）');
console.log('');
console.log('⚠️  警告: 清理操作不可逆转，请确认后再执行！');
console.log('💡 推荐使用: performFullCleanup()'); 