<script setup>
    import PhoneItem from '../../components/PhoneItem.vue'
    import Breadcrumbs from '../../components/Breadcrumbs.vue'
    import { inject, onMounted, ref } from 'vue'
    
    const axios = inject('axios')
    
    const brandOptions = [
        { id: 'iPhone', display: 'Apple iPhone' },
        { id: 'Samsung', display: 'Samsung S Series' },
        { id: 'SamsungZ', display: 'Samsung Z Series' },
        { id: 'SamsungNote', display: 'Samsung Note Series' }
    ]
    
    const brandName = ref('iPhone')
    const phones = ref([])
    
    // Simple function to handle dropdown change
    const onBrandChange = (event) => {
        brandName.value = event.target.value
        console.log('Brand changed to:', brandName.value)
    }
    
    onMounted(() => {
    axios.get('getphones')
        .then((response) => {
            console.log('✅ Phones loaded in PhoneListView:', response.data.length)
            phones.value = response.data
            
            // Debug: Show some sample phones
            console.log('Sample phones:', response.data.slice(0, 3).map(p => ({ 
                brand: p.brand, 
                model: p.model 
            })))
        })
        .catch((error) => {
            console.error('❌ Error loading phones:', error)
        })
})

</script>

<template>
    <main>
        <Breadcrumbs :stage="1" />
        <h1>Select your Device</h1>
        
        <!-- Simple dropdown with v-model for two-way binding -->
        <select v-model="brandName" @change="onBrandChange">
            <option v-for="option in brandOptions" :value="option.id" :key="option.id">
                {{ option.display }}
            </option>
        </select>
        
        <!-- Debug info to see current brand -->
        <p style="text-align: center; margin: 10px;">
            Current brand: {{ brandName }}
        </p>
        
        <div class="phoneList">
            <PhoneItem v-for="item in phones" :phone="item" :brand="brandName" :key="item.id" />
        </div>
    </main>
</template>

<style scoped>
    select {
        margin: 0 auto;
        margin-top: 25px;
        display: block;
        height: 50px;
        width: 100%;
        max-width: 350px;
        text-align: center;
        font-weight: bold;
        font-size: 18px;
    }
    
    .phoneList {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin: 50px 50px;
        min-height: calc(100vh - 100px);
    }
    
    h1 {
        text-align: center;
        width: 100%;
        font-weight: 500;
    }
</style>