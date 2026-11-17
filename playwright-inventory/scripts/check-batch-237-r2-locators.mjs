import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Offline DOM reproductions of the observed strict-mode collision and source
// global confirmation + reason prompt contract. No application credentials.
const browser=await chromium.launch({headless:true,...(process.env.PW_OFFLINE_CHROMIUM?{executablePath:process.env.PW_OFFLINE_CHROMIUM}:{})});
try{
 const page=await browser.newPage();
 await page.setContent(`<form id="purchase-order-form"><label>Supplier<select><option value="">Select supplier</option><option value="pw-supplier">Synthetic Supplier</option></select></label>
 <div class="purchase-orders-item-card"><label>Product<select disabled><option>Select a supplier</option></select><small>Choose a supplier before selecting products.</small></label>
 <label>Quantity<input type="number"></label><label>Ordering unit<select><option>pcs</option></select></label><label>Purchase price per unit<input type="number"><small>Supplier purchase price</small></label></div></form>
 <div id="replenishment-planning-workspace-top"><div>Live evidence was checked again. Nothing was approved or executed.</div></div>
 <div role="status"><span>Live evidence was checked again. Nothing was approved or executed.</span></div>
 <button id="block" onclick="if(confirm('Confirm action: Block?')){const reason=prompt('Why should this stock be blocked from use?');if(reason!==null)document.querySelector('#result').textContent=reason.trim().length<3?'Please enter at least 3 characters for the reason.':reason.trim()}">Block</button><div id="result"></div>`);
 await page.locator('#purchase-order-form select').first().evaluate(el=>el.addEventListener('change',()=>{const p=document.querySelector('.purchase-orders-item-card select');p.disabled=false;p.innerHTML='<option>Select product</option><option value="pw-product">Synthetic Component (pcs)</option>';}));
 const form=page.locator('#purchase-order-form');
 assert.equal(await form.getByLabel('Supplier').count(),3);
 await form.getByRole('combobox').filter({has:page.locator('option[value="pw-supplier"]')}).selectOption('pw-supplier');
 const line=form.locator('.purchase-orders-item-card');
 const product=line.getByRole('combobox').filter({has:page.locator('option[value="pw-product"]')});
 assert(await product.isEnabled());await product.selectOption('pw-product');
 await line.getByRole('spinbutton',{name:'Quantity',exact:true}).fill('5');
 await line.getByRole('spinbutton',{name:'Purchase price per unit'}).fill('15');
 assert.equal(await product.inputValue(),'pw-product');
 assert.equal(await line.getByRole('spinbutton',{name:'Quantity',exact:true}).inputValue(),'5');
 assert.equal(await line.getByRole('spinbutton',{name:'Purchase price per unit'}).inputValue(),'15');
 assert.equal(await page.getByText('Nothing was approved or executed.',{exact:false}).count(),2);
 assert.equal(await page.locator('#replenishment-planning-workspace-top').getByText('Nothing was approved or executed.',{exact:false}).count(),1);
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Block',exact:true}).click();assert.equal(await page.locator('#result').textContent(),'');
 for(const [reason,expected] of [['ab','Please enter at least 3 characters for the reason.'],['  Investigation needed  ','Investigation needed']]){
  const seen=[];const onLotDialog=async d=>{
   seen.push(d.type());
   if(d.type()==='confirm'&&d.message()==='Confirm action: Block?')return d.accept();
   if(d.type()==='prompt'){page.off('dialog',onLotDialog);return d.accept(reason);}
   return d.dismiss();
  };
  page.on('dialog',onLotDialog);await page.getByRole('button',{name:'Block',exact:true}).click();
  assert.deepEqual(seen,['confirm','prompt']);assert.equal(await page.locator('#result').textContent(),expected);
 }
 console.log('PASS B237 R2 offline Chromium: supplier/product option locators, duplicate status scope, cancel and two-stage confirmation/prompt.');
}finally{await browser.close();}
