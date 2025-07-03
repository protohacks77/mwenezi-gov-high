import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  DollarSign, 
  Calendar, 
  Save,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export function AdminConfig() {
  const { config } = useDataStore()
  const [isLoading, setIsLoading] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  
  const [fees, setFees] = useState(config?.fees || {
    dayScholar: {
      zjc: 200,
      oLevel: 200,
      aLevelSciences: 250,
      aLevelCommercials: 230,
      aLevelArts: 230
    },
    boarder: {
      zjc: 300,
      oLevel: 300,
      aLevelSciences: 350,
      aLevelCommercials: 330,
      aLevelArts: 330
    }
  })

  const handleFeeChange = (category: string, level: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setFees(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [level]: numValue
      }
    }))
  }

  const saveFeeStructure = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would call a Netlify function to update fees
      toast.success('Fee structure updated successfully!')
    } catch (error) {
      toast.error('Failed to update fee structure')
    } finally {
      setIsLoading(false)
    }
  }

  const addNewTerm = async () => {
    if (!newTerm.trim()) {
      toast.error('Please enter a term name')
      return
    }

    setIsLoading(true)
    try {
      // In a real app, this would call a Netlify function to add a new term
      toast.success(`Term "${newTerm}" added successfully!`)
      setNewTerm('')
    } catch (error) {
      toast.error('Failed to add new term')
    } finally {
      setIsLoading(false)
    }
  }

  const removeTerm = async (termKey: string) => {
    if (config?.activeTerms.length === 1) {
      toast.error('Cannot remove the last active term')
      return
    }

    setIsLoading(true)
    try {
      // In a real app, this would call a Netlify function to remove the term
      toast.success(`Term "${termKey}" removed successfully!`)
    } catch (error) {
      toast.error('Failed to remove term')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fee & Term Configuration</h1>
          <p className="text-slate-400 mt-1">Manage school fee structure and active terms</p>
        </div>
      </div>

      {/* Fee Structure */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-amber-primary" />
            Fee Structure
          </CardTitle>
          <CardDescription className="text-slate-400">
            Set fees for different student categories and grade levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Day Scholar Fees */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Day Scholar Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">ZJC</Label>
                <Input
                  type="number"
                  value={fees.dayScholar.zjc}
                  onChange={(e) => handleFeeChange('dayScholar', 'zjc', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">O Level</Label>
                <Input
                  type="number"
                  value={fees.dayScholar.oLevel}
                  onChange={(e) => handleFeeChange('dayScholar', 'oLevel', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">A Level Sciences</Label>
                <Input
                  type="number"
                  value={fees.dayScholar.aLevelSciences}
                  onChange={(e) => handleFeeChange('dayScholar', 'aLevelSciences', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">A Level Commercials</Label>
                <Input
                  type="number"
                  value={fees.dayScholar.aLevelCommercials}
                  onChange={(e) => handleFeeChange('dayScholar', 'aLevelCommercials', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">A Level Arts</Label>
                <Input
                  type="number"
                  value={fees.dayScholar.aLevelArts}
                  onChange={(e) => handleFeeChange('dayScholar', 'aLevelArts', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Boarder Fees */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Boarder Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">ZJC</Label>
                <Input
                  type="number"
                  value={fees.boarder.zjc}
                  onChange={(e) => handleFeeChange('boarder', 'zjc', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">O Level</Label>
                <Input
                  type="number"
                  value={fees.boarder.oLevel}
                  onChange={(e) => handleFeeChange('boarder', 'oLevel', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">A Level Sciences</Label>
                <Input
                  type="number"
                  value={fees.boarder.aLevelSciences}
                  onChange={(e) => handleFeeChange('boarder', 'aLevelSciences', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">A Level Commercials</Label>
                <Input
                  type="number"
                  value={fees.boarder.aLevelCommercials}
                  onChange={(e) => handleFeeChange('boarder', 'aLevelCommercials', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">A Level Arts</Label>
                <Input
                  type="number"
                  value={fees.boarder.aLevelArts}
                  onChange={(e) => handleFeeChange('boarder', 'aLevelArts', e.target.value)}
                  className="bg-slate-primary border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={saveFeeStructure}
            disabled={isLoading}
            variant="maroon"
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Save Fee Structure
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Active Terms */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-amber-primary" />
            Active Terms
          </CardTitle>
          <CardDescription className="text-slate-400">
            Manage active billing terms for the school year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Active Terms */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Current Active Terms</h3>
            <div className="flex flex-wrap gap-2">
              {config?.activeTerms.map((term) => (
                <div key={term} className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-amber-500 text-amber-400">
                    {term.replace('_', ' ')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTerm(term)}
                    className="h-6 w-6 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Term */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Add New Term</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="e.g., 2025_Term2"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                className="bg-slate-primary border-slate-600 text-white"
              />
              <Button 
                onClick={addNewTerm}
                disabled={isLoading}
                variant="maroon"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Term
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Adding a new term will automatically bill all existing students for that term
            </p>
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-medium">Important Notice</h4>
                <p className="text-amber-300 text-sm mt-1">
                  When you add a new term, all existing students will be automatically billed 
                  according to their student type and grade category. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}