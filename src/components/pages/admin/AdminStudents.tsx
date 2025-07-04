import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  Plus,
  UserPlus,
  GraduationCap,
  Phone,
  DollarSign,
  Eye,
  Edit
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency } from '@/lib/utils'
import { CreateStudentModal } from '@/components/modals/CreateStudentModal'
import { StudentDetailsModal } from '@/components/modals/StudentDetailsModal'

export function AdminStudents() {
  const { students } = useDataStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterGrade, setFilterGrade] = useState('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const studentList = Object.values(students)

  const filteredStudents = studentList.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || student.studentType === filterType
    const matchesGrade = filterGrade === 'all' || student.gradeCategory === filterGrade

    return matchesSearch && matchesType && matchesGrade
  })

  const getStatusColor = (balance: number) => {
    if (balance <= 0) return 'bg-green-500'
    if (balance <= 100) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getStatusText = (balance: number) => {
    if (balance <= 0) return 'Paid'
    if (balance <= 100) return 'Partial'
    return 'Arrears'
  }

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Students</h1>
          <p className="text-slate-400 mt-1">View and manage all enrolled students</p>
        </div>
        <Button 
          onClick={() => setCreateModalOpen(true)}
          variant="maroon"
          className="flex items-center"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Students</p>
                <p className="text-2xl font-bold text-white">{studentList.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Fully Paid</p>
                <p className="text-2xl font-bold text-green-400">
                  {studentList.filter(s => s.financials.balance <= 0).length}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Partial Payment</p>
                <p className="text-2xl font-bold text-amber-400">
                  {studentList.filter(s => s.financials.balance > 0 && s.financials.balance <= 100).length}
                </p>
              </div>
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">In Arrears</p>
                <p className="text-2xl font-bold text-red-400">
                  {studentList.filter(s => s.financials.balance > 100).length}
                </p>
              </div>
              <div className="w-3 h-3 bg-red-500 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or student number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-primary border-slate-600 text-white"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Student Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Day Scholar">Day Scholar</SelectItem>
                <SelectItem value="Boarder">Boarder</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-full md:w-48 bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Grade Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="ZJC">ZJC</SelectItem>
                <SelectItem value="OLevel">O Level</SelectItem>
                <SelectItem value="ALevel">A Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Students ({filteredStudents.length})</CardTitle>
          <CardDescription className="text-slate-400">
            Click on a student to view detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <motion.div
                  key={student.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-slate-primary rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer"
                  onClick={() => handleStudentClick(student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(student.financials.balance)}`} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-white font-medium">
                            {student.name} {student.surname}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {student.studentNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-slate-400">
                          <div className="flex items-center">
                            <GraduationCap className="w-4 h-4 mr-1" />
                            {student.grade} • {student.studentType}
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {student.guardianPhoneNumber}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`font-bold ${
                          student.financials.balance <= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(student.financials.balance)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getStatusText(student.financials.balance)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No students found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateStudentModal 
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <StudentDetailsModal
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        studentId={selectedStudentId}
      />
    </div>
  )
}