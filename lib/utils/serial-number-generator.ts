/**
 * Gets the next sequential serial number for a user's variants
 * Simply increments from the highest existing serial number for that user
 * This ensures sequential numbering and no gaps
 */
export async function getNextSerialNumber(
  userId: string,
  supabase: any // Supabase client
): Promise<number> {
  // Get the highest serial number for this user
  const { data: maxSerialData, error } = await supabase
    .from('variants')
    .select('serial_number')
    .eq('user_id', userId)
    .not('serial_number', 'is', null)
    .order('serial_number', { ascending: false })
    .limit(1);
  
  if (error) {
    throw new Error(`Failed to get max serial number: ${error.message}`);
  }
  
  // If no variants exist for this user, start with 1
  if (!maxSerialData || maxSerialData.length === 0) {
    return 1;
  }
  
  const maxSerial = parseInt(maxSerialData[0].serial_number, 10);
  
  // If parsing fails or result is invalid, start with 1
  if (isNaN(maxSerial) || maxSerial < 0) {
    return 1;
  }
  
  // Check if we're approaching the smallint limit (32767)
  if (maxSerial >= 32766) {
    throw new Error('Serial number limit reached. Maximum is 32767 variants per user.');
  }
  
  // Return next sequential number
  return maxSerial + 1;
}

/**
 * Inserts variants with sequential serial numbers
 * Uses atomic approach to ensure sequential numbering without gaps
 */
export async function insertVariantsWithUniqueSerials(
  variants: any[],
  userId: string,
  supabase: any // Supabase client
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (variants.length === 0) {
    return { success: true, insertedCount: 0 };
  }
  
  let insertedCount = 0;
  const maxRetries = 5;
  
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      // Get the starting serial number for this batch
      let currentSerial = await getNextSerialNumber(userId, supabase);
      
      // Prepare all variants with sequential serial numbers
      const variantsWithSerials = variants.slice(insertedCount).map((variant, index) => ({
        ...variant,
        serial_number: currentSerial + index,
        user_id: userId,
      }));
      
      // Try to insert all remaining variants as a batch
      const { error: batchError } = await supabase
        .from('variants')
        .insert(variantsWithSerials);
      
      if (batchError) {
        if (batchError.message?.includes('unique_serial_per_user') || 
            batchError.message?.includes('duplicate key value')) {
          // Race condition occurred, retry with new serial numbers
          console.log(`Serial number conflict, retrying... (attempt ${retry + 1}/${maxRetries})`);
          
          // Add a small delay to reduce race condition probability
          await new Promise(resolve => setTimeout(resolve, 50 + retry * 50));
          continue;
        } else {
          // Different error, try inserting one by one
          console.log('Batch insert failed, trying individual inserts...');
          
          for (let i = insertedCount; i < variants.length; i++) {
            try {
              const serialNumber = await getNextSerialNumber(userId, supabase);
              const variantToInsert = {
                ...variants[i],
                serial_number: serialNumber,
                user_id: userId,
              };
              
              const { error: individualError } = await supabase
                .from('variants')
                .insert([variantToInsert]);
              
              if (individualError) {
                throw new Error(`Failed to insert variant ${i + 1}: ${individualError.message}`);
              }
              
              insertedCount++;
            } catch (individualErr: any) {
              return {
                success: false,
                insertedCount,
                error: individualErr.message || 'Failed during individual insert'
              };
            }
          }
          
          return { success: true, insertedCount };
        }
      } else {
        // Batch insert successful
        insertedCount += variantsWithSerials.length;
        return { success: true, insertedCount };
      }
      
    } catch (error: any) {
      if (retry === maxRetries - 1) {
        return {
          success: false,
          insertedCount,
          error: error.message || 'Unknown error occurred'
        };
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100 * (retry + 1)));
    }
  }
  
  return {
    success: false,
    insertedCount,
    error: `Failed to insert variants after ${maxRetries} attempts`
  };
}